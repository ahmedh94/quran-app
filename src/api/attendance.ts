import { getDb } from './db';
import type { Student, StudentWithAttendance, AttendanceRecordInput, AttendanceSummary, AttendanceHistoryItem, AttendanceStats } from '../types';

export async function getAttendance(date: string, halaqaId?: number | null): Promise<StudentWithAttendance[]> {
  const db = await getDb();
  const students = halaqaId
    ? await db.getAllAsync<Student>('SELECT * FROM students WHERE halaqa_id = ? ORDER BY name', [halaqaId])
    : await db.getAllAsync<Student>('SELECT * FROM students ORDER BY name');
  const attendanceRows = await db.getAllAsync<{ student_id: number; status: string }>(
    'SELECT * FROM attendance WHERE date = ?', [date]
  );
  const map: Record<number, string> = {};
  attendanceRows.forEach((a) => { map[a.student_id] = a.status; });
  return students.map((s) => ({ ...s, status: (map[s.id] as StudentWithAttendance['status']) || null }));
}

export async function saveAttendance(date: string, records: AttendanceRecordInput[]): Promise<{ saved: number }> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of records) {
      await db.runAsync(
        `INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)
         ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status`,
        [r.student_id, date, r.status]
      );
    }
  });
  return { saved: records.length };
}

export async function getAttendanceSummary(date: string): Promise<AttendanceSummary> {
  const db = await getDb();
  const total = (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM students'))?.c ?? 0;
  const present = (await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM attendance WHERE date = ? AND status = 'present'", [date]
  ))?.c ?? 0;
  return { total, present, absent: present > total ? 0 : total - present };
}

export async function getAttendanceHistory(studentId: number): Promise<AttendanceHistoryItem[]> {
  const db = await getDb();
  return db.getAllAsync<AttendanceHistoryItem>(
    'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
    [studentId]
  );
}

export async function getAttendanceStats(studentId: number): Promise<AttendanceStats> {
  const db = await getDb();
  const total = (await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM attendance WHERE student_id = ?', [studentId]
  ))?.c ?? 0;
  const present = (await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND status = 'present'", [studentId]
  ))?.c ?? 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent: total - present, percentage };
}

/** عدد الحصص اللي الطالب حضرها فعليًا في شهر معيّن (YYYY-MM) — يستخدم لحساب "الحصص المتبقية" */
export async function getPresentCountForMonth(studentId: number, month: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM attendance
     WHERE student_id = ? AND status = 'present' AND substr(date,1,7) = ?`,
    [studentId, month]
  );
  return row?.c ?? 0;
}
