import { getDb } from './db';
import type { Payment, PaymentsSummary } from '../types';

export async function getPayments(month: string, status?: string | null): Promise<Payment[]> {
  const db = await getDb();
  let query = `SELECT p.*, s.name AS student_name FROM payments p
               JOIN students s ON p.student_id = s.id WHERE p.month = ?`;
  const params: (string | number)[] = [month];
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  query += ' ORDER BY s.name';
  return db.getAllAsync<Payment>(query, params);
}

export async function getPaymentsByStudent(studentId: number): Promise<Payment[]> {
  const db = await getDb();
  return db.getAllAsync<Payment>(
    `SELECT p.*, s.name AS student_name FROM payments p JOIN students s ON p.student_id = s.id
     WHERE p.student_id = ? ORDER BY p.month DESC`,
    [studentId]
  );
}

export async function getPaymentsSummary(month: string): Promise<PaymentsSummary> {
  const db = await getDb();
  const paid = (await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE month = ? AND status = 'paid'", [month]
  ))?.total ?? 0;
  const due = (await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE month = ? AND status = 'due'", [month]
  ))?.total ?? 0;
  return { paid, due };
}

export async function createPayment(data: {
  student_id: number;
  month: string;
  amount: number;
  status?: string;
  method?: string | null;
  note?: string | null;
}): Promise<Payment | null> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO payments (student_id, month, amount, status, method, note) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, month) DO UPDATE SET amount = excluded.amount`,
    [data.student_id, data.month, data.amount, data.status ?? 'due', data.method ?? null, data.note ?? null]
  );
  return db.getFirstAsync<Payment>('SELECT * FROM payments WHERE student_id = ? AND month = ?', [data.student_id, data.month]);
}

export async function markPaymentPaid(id: number, data: { method?: string | null; note?: string | null }): Promise<Payment | null> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE payments SET status = 'paid', paid_date = date('now'), method = ?, note = COALESCE(?, note) WHERE id = ?`,
    [data.method ?? null, data.note ?? null, id]
  );
  return db.getFirstAsync<Payment>('SELECT * FROM payments WHERE id = ?', [id]);
}
