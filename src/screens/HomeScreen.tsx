import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { colors, spacing, radius, shadow } from '../theme';
import { TopBar, StatCard, Row, Badge } from '../components';
import api from '../api';
import { dateToYMD } from '../utils/time';
import type { RootTabParamList, MemorizationSession, Payment, CalendarEvent } from '../types';

LocaleConfig.locales['ar'] = {
  monthNames: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  monthNamesShort: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  dayNames: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
  dayNamesShort: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
};
LocaleConfig.defaultLocale = 'ar';

function todayISO(): string {
  return dateToYMD(new Date());
}
function monthISO(): string {
  return todayISO().slice(0, 7);
}

type Props = BottomTabScreenProps<RootTabParamList, 'الرئيسية'>;

export default function HomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [recentSessions, setRecentSessions] = useState<MemorizationSession[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<Payment[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState<Payment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [students, attSummary, dueList, sessions, paid, monthEvents] = await Promise.all([
        api.getStudents(),
        api.getAttendanceSummary(todayISO()),
        api.getPayments(monthISO(), 'due'),
        api.getSessions(),
        api.getPayments(monthISO(), 'paid'),
        api.getEvents(selectedDate.slice(0, 7)),
      ]);
      setTotalStudents(students.length);
      setPresentToday(attSummary.present || 0);
      setDueCount(dueList.length);
      setOverdueStudents(dueList);
      setRecentSessions(sessions.slice(0, 3));
      setPaidThisMonth(paid);
      setEvents(monthEvents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  // مهم: بننشئ object جديد وندمج فيه تظليل "اليوم المحدد" مع أي نقطة (dot) موجودة
  // أصلاً لنفس اليوم، بدل ما نستبدلها بالكامل - عشان اليوم المحدد ما يفقدش الـ dot بتاعته
  const markedDates: Record<string, any> = {};
  events.forEach((e) => {
    markedDates[e.event_date] = { marked: true, dotColor: colors.pinkDark };
  });
  markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: colors.pink };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="مساء الخير 👋" subtitle="لوحة المتابعة" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.pinkDark]} />}
      >
        {error ? (
          <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.md }}>
            حصل خطأ في قراءة البيانات المحلية.{'\n'}({error})
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.lg }}>
          <StatCard label="إجمالي الطلاب" value={totalStudents} />
          <StatCard label="حاضر اليوم" value={presentToday} />
          <StatCard label="اشتراكات مستحقة" value={dueCount} />
        </View>

        <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
        <View style={styles.quickRow}>
          <QuickAction icon="user-friends" label="الطلاب" onPress={() => navigation.navigate('الطلاب')} />
          <QuickAction icon="book-open" label="متابعة الحفظ" onPress={() => navigation.navigate('الحفظ')} />
          <QuickAction icon="calendar-alt" label="المواعيد" onPress={() => navigation.navigate('المواعيد')} {...shadow} />
        </View>

        <Text style={styles.sectionTitle}>التقويم</Text>
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: colors.pink,
            todayTextColor: colors.pinkDark,
            arrowColor: colors.pinkDark,
            dotColor: colors.pinkDark,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
          }}
          style={{ borderRadius: radius.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow }}
        />

        {overdueStudents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>اشتراكات متأخرة ⚠️</Text>
            {overdueStudents.map((p) => (
              <Row
                key={p.id}
                left={p.student_name || ''}
                subtitle={`${p.amount} ج.م — مستحق عن ${p.month}`}
                right={<Badge text="متأخر" type="warning" />}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>الاشتراكات المدفوعة هذا الشهر</Text>
        {paidThisMonth.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
            لسه محدش دفع الشهر ده
          </Text>
        ) : (
          paidThisMonth.map((p) => (
            <Row
              key={p.id}
              left={p.student_name || ''}
              subtitle={`${p.amount} ج.م — ${p.paid_date || ''}`}
              right={<Badge text="مدفوع" type="success" />}
            />
          ))
        )}

        <Text style={styles.sectionTitle}>آخر جلسات الحفظ</Text>
        {recentSessions.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm }}>
            لسه معملتش أي تسجيل حفظ
          </Text>
        ) : (
          recentSessions.map((s) => (
            <Row
              key={s.id}
              left={`${s.student_name} — ${s.session_type}`}
              subtitle={s.surah ? `${s.surah}${s.ayah_from ? ` (${s.ayah_from}-${s.ayah_to || ''})` : ''}` : ''}
              right={s.evaluation ? <Badge text={s.evaluation} type={s.evaluation === 'يحتاج مراجعة' ? 'warning' : 'success'} /> : null}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
}
function QuickAction({ icon, label, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress}>
      <FontAwesome5 name={icon as any} size={20} color={colors.pinkDark} />
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: '800', color: colors.pinkDark, marginBottom: spacing.sm, marginTop: spacing.sm, textAlign: 'right' },
  quickRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.lg },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  quickLabel: { fontSize: 11, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
});
