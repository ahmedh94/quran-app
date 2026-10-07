// scheduleColors.ts - لون ثابت لكل طالب في جدول الحصص الأسبوعي
interface ScheduleColor {
    bg: string;
    border: string;
    text: string;
}

const PALETTE: ScheduleColor[] = [
    { bg: '#f9d5e3', border: '#c9789e', text: '#c9789e' }, // بينك
    { bg: '#a8c7e8', border: '#5b87b5', text: '#5b87b5' }, // أزرق
    { bg: '#b7ddc0', border: '#4c8a5c', text: '#4c8a5c' }, // أخضر
    { bg: '#ffe0b2', border: '#e65100', text: '#e65100' }, // برتقالي
    { bg: '#d1c4e9', border: '#5e35b1', text: '#5e35b1' }, // بنفسجي
    { bg: '#fff9c4', border: '#9e8800', text: '#9e8800' }, // أصفر غامق
];

/** بيدي نفس اللون دايمًا لنفس الطالب (حسب الـ id بتاعه) */
export function getStudentColor(studentId: number | null): ScheduleColor {
    if (studentId == null) return { bg: '#eee', border: '#999', text: '#999' };
    return PALETTE[studentId % PALETTE.length];
}