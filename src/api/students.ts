import { getDb } from './db';
import type { Student } from '../types';

export async function getStudents(halaqaId?: number | null): Promise<Student[]> {
  const db = await getDb();
  if (halaqaId) {
    return db.getAllAsync<Student>(
      `SELECT s.*, h.name AS halaqa_name FROM students s LEFT JOIN halaqas h ON s.halaqa_id = h.id
       WHERE s.halaqa_id = ? ORDER BY s.name`,
      [halaqaId]
    );
  }
  return db.getAllAsync<Student>(
    `SELECT s.*, h.name AS halaqa_name FROM students s LEFT JOIN halaqas h ON s.halaqa_id = h.id ORDER BY s.name`
  );
}

export async function createStudent(data: {
  name: string;
  halaqa_id?: number | null;
  phone?: string | null;
  monthly_fee?: number;
  sessions_per_month?: number | null;
}): Promise<Student | null> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO students (name, halaqa_id, phone, monthly_fee, sessions_per_month) VALUES (?, ?, ?, ?, ?)',
    [data.name, data.halaqa_id ?? null, data.phone ?? null, data.monthly_fee ?? 200, data.sessions_per_month ?? null]
  );
  return db.getFirstAsync<Student>('SELECT * FROM students WHERE id = ?', [result.lastInsertRowId]);
}

export async function getStudentById(id: number): Promise<Student | null> {
  const db = await getDb();
  return db.getFirstAsync<Student>(
    `SELECT s.*, h.name AS halaqa_name FROM students s LEFT JOIN halaqas h ON s.halaqa_id = h.id WHERE s.id = ?`,
    [id]
  );
}

export async function updateStudent(
  id: number,
  data: { name?: string; halaqa_id?: number | null; phone?: string | null; monthly_fee?: number; sessions_per_month?: number | null }
): Promise<Student | null> {
  const db = await getDb();
  const current = await db.getFirstAsync<Student>('SELECT * FROM students WHERE id = ?', [id]);
  if (!current) return null;
  await db.runAsync(
    'UPDATE students SET name = ?, halaqa_id = ?, phone = ?, monthly_fee = ?, sessions_per_month = ? WHERE id = ?',
    [
      data.name ?? current.name,
      data.halaqa_id ?? current.halaqa_id,
      data.phone ?? current.phone,
      data.monthly_fee ?? current.monthly_fee,
      data.sessions_per_month !== undefined ? data.sessions_per_month : current.sessions_per_month,
      id,
    ]
  );
  return db.getFirstAsync<Student>('SELECT * FROM students WHERE id = ?', [id]);
}

export async function deleteStudent(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM students WHERE id = ?', [id]);
}
