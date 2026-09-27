import { getDb } from './db';
import type { MemorizationSession, MemorizationSessionInput } from '../types';

export async function getSessions(studentId?: number | null): Promise<MemorizationSession[]> {
  const db = await getDb();
  if (studentId) {
    return db.getAllAsync<MemorizationSession>(
      `SELECT ms.*, s.name AS student_name FROM memorization_sessions ms
       JOIN students s ON ms.student_id = s.id
       WHERE ms.student_id = ? ORDER BY ms.date DESC, ms.id DESC`,
      [studentId]
    );
  }
  return db.getAllAsync<MemorizationSession>(
    `SELECT ms.*, s.name AS student_name FROM memorization_sessions ms
     JOIN students s ON ms.student_id = s.id
     ORDER BY ms.date DESC, ms.id DESC`
  );
}

export async function createSession(data: MemorizationSessionInput): Promise<MemorizationSession | null> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO memorization_sessions
      (student_id, date, session_type, surah, ayah_from, ayah_to, evaluation, notes, next_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.student_id, data.date, data.session_type,
      data.surah ?? null, data.ayah_from ?? null, data.ayah_to ?? null,
      data.evaluation ?? null, data.notes ?? null, data.next_target ?? null,
    ]
  );
  return db.getFirstAsync<MemorizationSession>('SELECT * FROM memorization_sessions WHERE id = ?', [result.lastInsertRowId]);
}
