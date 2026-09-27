// types.ts - أنواع البيانات المشتركة في التطبيق كله

export interface Halaqa {
  id: number;
  name: string;
  level: string | null;
}

export interface Student {
  id: number;
  name: string;
  halaqa_id: number | null;
  phone: string | null;
  monthly_fee: number;
  sessions_per_month: number | null;
  join_date: string;
  halaqa_name?: string | null;
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecordInput {
  student_id: number;
  status: AttendanceStatus;
}

export interface StudentWithAttendance extends Student {
  status: AttendanceStatus | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
}

export type SessionType = 'حفظ جديد' | 'مراجعة صغرى' | 'مراجعة كبرى' | 'تجويد';
export type Evaluation = 'ممتاز' | 'جيد' | 'يحتاج مراجعة';

export interface MemorizationSession {
  id: number;
  student_id: number;
  date: string;
  session_type: string;
  surah: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  evaluation: string | null;
  notes: string | null;
  next_target: string | null;
  student_name?: string;
}

export interface MemorizationSessionInput {
  student_id: number;
  date: string;
  session_type: string;
  surah?: string | null;
  ayah_from?: number | null;
  ayah_to?: number | null;
  evaluation?: string | null;
  notes?: string | null;
  next_target?: string | null;
}

export type PaymentStatus = 'paid' | 'due';

export interface Payment {
  id: number;
  student_id: number;
  month: string;
  amount: number;
  status: PaymentStatus;
  paid_date: string | null;
  method: string | null;
  note: string | null;
  student_name?: string;
}

export interface PaymentsSummary {
  paid: number;
  due: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  event_date: string;
  event_time: string | null;
  halaqa_id: number | null;
  student_id: number | null;
  recurrence_id: string | null;
  type: string;
  notes: string | null;
  halaqa_name?: string | null;
  student_name?: string | null;
}

export interface CalendarEventInput {
  title: string;
  event_date: string;
  event_time?: string | null;
  halaqa_id?: number | null;
  student_id?: number | null;
  recurrence_id?: string | null;
  type?: string;
  notes?: string | null;
}

export interface AttendanceHistoryItem {
  id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

// أسماء التابات في التنقل السفلي - مستخدمة في التايبات الخاصة بالنافيجيشن
export type RootTabParamList = {
  الرئيسية: undefined;
  الطلاب: undefined;
  الحفظ: undefined;
  المواعيد: undefined;
  الإعدادات: undefined;
};

// شاشات الـ Stack الخاصة بتاب "الطلاب" (قائمة الطلاب ← ملف الطالب)
export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: number; studentName: string };
};
