// api/db.ts
// قاعدة بيانات محلية بالكامل جوه الموبايل نفسه (SQLite عن طريق expo-sqlite)
// مفيش سيرفر، مفيش IP، مفيش إنترنت لازم — كل حاجة بتتخزن على نفس الجهاز.
import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('quran_app.db');

      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS halaqas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          level TEXT
        );

        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          halaqa_id INTEGER,
          phone TEXT,
          monthly_fee REAL DEFAULT 200,
          sessions_per_month INTEGER,
          join_date TEXT DEFAULT (date('now')),
          FOREIGN KEY (halaqa_id) REFERENCES halaqas(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('present','absent','excused')),
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          UNIQUE(student_id, date)
        );

        CREATE TABLE IF NOT EXISTS memorization_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          session_type TEXT NOT NULL,
          surah TEXT,
          ayah_from INTEGER,
          ayah_to INTEGER,
          evaluation TEXT,
          notes TEXT,
          next_target TEXT,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          month TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'due' CHECK(status IN ('paid','due')),
          paid_date TEXT,
          method TEXT,
          note TEXT,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          UNIQUE(student_id, month)
        );

        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          event_date TEXT NOT NULL,
          event_time TEXT,
          halaqa_id INTEGER,
          student_id INTEGER,
          recurrence_id TEXT,
          type TEXT DEFAULT 'session',
          notes TEXT,
          FOREIGN KEY (halaqa_id) REFERENCES halaqas(id) ON DELETE SET NULL,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Seed: أول حلقة افتراضية لو قاعدة البيانات فاضية بالكامل
      const halaqaCount = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM halaqas');
      if (halaqaCount && halaqaCount.c === 0) {
        await db.runAsync('INSERT INTO halaqas (name, level) VALUES (?, ?)', ['حلقة الفرقان', 'المستوى الأول']);
      }

      // ترقية آمنة: لو التطبيق كان مثبت قبل كده وجدول events ماكانش فيه عمود student_id، ضيفه دلوقتي
      const eventsColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events)');
      const hasStudentId = eventsColumns.some((c) => c.name === 'student_id');
      if (!hasStudentId) {
        await db.execAsync('ALTER TABLE events ADD COLUMN student_id INTEGER REFERENCES students(id)');
      }
      const hasRecurrenceId = eventsColumns.some((c) => c.name === 'recurrence_id');
      if (!hasRecurrenceId) {
        await db.execAsync('ALTER TABLE events ADD COLUMN recurrence_id TEXT');
      }

      const studentsColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(students)');
      const hasSessionsPerMonth = studentsColumns.some((c) => c.name === 'sessions_per_month');
      if (!hasSessionsPerMonth) {
        await db.execAsync('ALTER TABLE students ADD COLUMN sessions_per_month INTEGER');
      }

      const attendanceTableSql = await db.getFirstAsync<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance'"
      );
      if (attendanceTableSql && !attendanceTableSql.sql.includes('excused')) {
        await db.execAsync(`
    CREATE TABLE attendance_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','excused')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, date)
    );
    INSERT INTO attendance_new SELECT * FROM attendance;
    DROP TABLE attendance;
    ALTER TABLE attendance_new RENAME TO attendance;
  `);
      }

      return db;
    })();
  }
  return dbPromise;
}
