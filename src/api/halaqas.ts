import { getDb } from './db';
import type { Halaqa } from '../types';

export async function getHalaqas(): Promise<Halaqa[]> {
  const db = await getDb();
  return db.getAllAsync<Halaqa>('SELECT * FROM halaqas ORDER BY id');
}

export async function createHalaqa({ name, level }: { name: string; level?: string | null }): Promise<Halaqa | null> {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO halaqas (name, level) VALUES (?, ?)', [name, level ?? null]);
  return db.getFirstAsync<Halaqa>('SELECT * FROM halaqas WHERE id = ?', [result.lastInsertRowId]);
}
