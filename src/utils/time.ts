// time.ts - أدوات مشتركة لتنسيق الوقت

/** يحوّل وقت 24 ساعة (HH:MM) لصيغة 12 ساعة بـ ص/م */
export function formatTime12h(time24: string | null | undefined): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** يحوّل كائن Date لصيغة HH:MM (24 ساعة) لتخزينها في قاعدة البيانات */
export function timeToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** يحوّل كائن Date لصيغة YYYY-MM-DD حسب التوقيت المحلي (من غير تحويل لـ UTC) */
export function dateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
