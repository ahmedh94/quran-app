import { getDb } from './db';
import type { CalendarEvent, CalendarEventInput } from '../types';

export async function getEvents(month: string): Promise<CalendarEvent[]> {
  const db = await getDb();
  return db.getAllAsync<CalendarEvent>(
    `SELECT e.*, h.name AS halaqa_name, s.name AS student_name
     FROM events e
     LEFT JOIN halaqas h ON e.halaqa_id = h.id
     LEFT JOIN students s ON e.student_id = s.id
     WHERE substr(e.event_date,1,7) = ? ORDER BY e.event_date, e.event_time`,
    [month]
  );
}

/** كل المواعيد ضمن مدى تاريخ معيّن (من/لـ) — مستخدمة في عرض الأسبوع */
export async function getEventsForDateRange(fromDate: string, toDate: string): Promise<CalendarEvent[]> {
  const db = await getDb();
  return db.getAllAsync<CalendarEvent>(
    `SELECT e.*, h.name AS halaqa_name, s.name AS student_name
     FROM events e
     LEFT JOIN halaqas h ON e.halaqa_id = h.id
     LEFT JOIN students s ON e.student_id = s.id
     WHERE e.event_date >= ? AND e.event_date <= ?
     ORDER BY e.event_date, e.event_time`,
    [fromDate, toDate]
  );
}

export async function getUpcomingEventsForStudent(studentId: number | null, fromDate: string): Promise<CalendarEvent[]> {
  if (!studentId) return [];
  const db = await getDb();
  return db.getAllAsync<CalendarEvent>(
    'SELECT * FROM events WHERE student_id = ? AND event_date >= ? ORDER BY event_date, event_time LIMIT 10',
    [studentId, fromDate]
  );
}

export async function createEvent(data: CalendarEventInput): Promise<CalendarEvent | null> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO events (title, event_date, event_time, halaqa_id, student_id, recurrence_id, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.title, data.event_date, data.event_time ?? null, data.halaqa_id ?? null,
      data.student_id ?? null, data.recurrence_id ?? null, data.type ?? 'session', data.notes ?? null,
    ]
  );
  return db.getFirstAsync<CalendarEvent>('SELECT * FROM events WHERE id = ?', [result.lastInsertRowId]);
}

function formatYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * بترجع تاريخ التكرار رقم index.
 * في الشهري: لو اليوم الأصلي 31 والشهر مفيهوش 31، بنستخدم آخر يوم في الشهر
 * (بدل ما JavaScript يرميه على الشهر اللي بعده).
 */
function getOccurrenceDate(base: Date, frequency: 'daily' | 'weekly' | 'monthly', index: number): Date {
  if (frequency === 'daily') {
    const next = new Date(base);
    next.setDate(base.getDate() + index);
    return next;
  }
  if (frequency === 'weekly') {
    const next = new Date(base);
    next.setDate(base.getDate() + index * 7);
    return next;
  }
  const targetMonthIndex = base.getMonth() + index;
  const year = base.getFullYear() + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(base.getDate(), lastDayOfMonth));
}

/**
 * مواعيد متكررة: يومي / أسبوعي / شهري، وبتنتهي بـ: عدد مرات، أو تاريخ معيّن،
 * أو "بلا نهاية" (= سنة كاملة قدّام، لأن مينفعش نخزّن مواعيد لا نهائية فعليًا).
 * كل المواعيد بتتربط بنفس recurrence_id عشان نقدر نلغي السلسلة كلها بعدين.
 */
export async function createRecurringEvents(
  data: CalendarEventInput & {
    frequency: 'daily' | 'weekly' | 'monthly';
    endMode: 'count' | 'date' | 'forever';
    occurrences?: number; // مطلوب لو endMode === 'count'
    endDate?: string;     // مطلوب لو endMode === 'date' (YYYY-MM-DD)
  }
): Promise<CalendarEvent[]> {
  const db = await getDb();
  const recurrenceId = `rec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const created: CalendarEvent[] = [];

  const [y, m, d] = data.event_date.split('-').map(Number);
  const baseDate = new Date(y, (m || 1) - 1, d || 1);

  const oneYearFromStart = new Date(baseDate);
  oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);

  const MAX_OCCURRENCES = 366; // حد أمان يمنع حلقة لا نهائية

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < MAX_OCCURRENCES; index++) {
      const occurrenceDate = getOccurrenceDate(baseDate, data.frequency, index);
      const eventDate = formatYMD(occurrenceDate);

      if (data.endMode === 'count' && index >= (data.occurrences ?? 1)) break;
      if (data.endMode === 'date' && data.endDate && eventDate > data.endDate) break;
      if (data.endMode === 'forever' && occurrenceDate > oneYearFromStart) break;

      const result = await db.runAsync(
        'INSERT INTO events (title, event_date, event_time, halaqa_id, student_id, recurrence_id, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          data.title, eventDate, data.event_time ?? null, data.halaqa_id ?? null,
          data.student_id ?? null, recurrenceId, data.type ?? 'session', data.notes ?? null,
        ]
      );
      const row = await db.getFirstAsync<CalendarEvent>('SELECT * FROM events WHERE id = ?', [result.lastInsertRowId]);
      if (row) created.push(row);
    }
  });

  return created;
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}

/** إلغاء كل مواعيد سلسلة التكرار من تاريخ معيّن فصاعدًا (بدل ما تلغي كل موعد لوحده) */
export async function deleteEventSeriesFrom(recurrenceId: string, fromDate: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events WHERE recurrence_id = ? AND event_date >= ?', [recurrenceId, fromDate]);
}