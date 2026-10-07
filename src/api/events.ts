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

/**
 * بتعمل مجموعة مواعيد أسبوعية متكررة (نفس اليوم والوقت كل أسبوع) دفعة واحدة،
 * وكلهم مرتبطين بنفس recurrence_id عشان لو حبينا نلغي السلسلة كلها بعدين.
 * بترجع كل المواعيد اللي اتعملت (occurrences).
 */
export async function createRecurringWeeklyEvents(
  data: CalendarEventInput & { occurrences: number }
): Promise<CalendarEvent[]> {
  const db = await getDb();
  const recurrenceId = `rec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const created: CalendarEvent[] = [];

  const [y, m, d] = data.event_date.split('-').map(Number);
  const baseDate = new Date(y, (m || 1) - 1, d || 1);

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < data.occurrences; i++) {
      const occurrenceDate = new Date(baseDate);
      occurrenceDate.setDate(occurrenceDate.getDate() + i * 7);
      const eventDate = `${occurrenceDate.getFullYear()}-${String(occurrenceDate.getMonth() + 1).padStart(2, '0')}-${String(occurrenceDate.getDate()).padStart(2, '0')}`;

      const result = await db.runAsync(
        'INSERT INTO events (title, event_date, event_time, halaqa_id, student_id, recurrence_id, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [data.title, eventDate, data.event_time ?? null, data.halaqa_id ?? null, data.student_id ?? null, recurrenceId, data.type ?? 'session', data.notes ?? null]
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
