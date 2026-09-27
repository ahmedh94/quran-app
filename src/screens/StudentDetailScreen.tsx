import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, radius } from '../theme';
import { StatCard, Row, Badge, LoadingView, PrimaryButton } from '../components';
import api from '../api';
import { formatTime12h, timeToHHMM, dateToYMD } from '../utils/time';
import { scheduleEventReminder, cancelAlarm } from '../notifications';
import type {
  StudentsStackParamList,
  Student,
  MemorizationSession,
  Payment,
  CalendarEvent,
  AttendanceHistoryItem,
  AttendanceStats,
  AttendanceStatus,
} from '../types';

function todayISO(): string {
  return dateToYMD(new Date());
}
function currentMonthYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentDetail'>;

export default function StudentDetailScreen({ route, navigation }: Props) {
  const { studentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<MemorizationSession[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, percentage: 0 });

  // حالة مودال إضافة موعد
  const [modalVisible, setModalVisible] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());
  const [timeValue, setTimeValue] = useState(() => {
    const d = new Date();
    d.setHours(16, 0, 0, 0);
    return d;
  });
  const [minutesBefore, setMinutesBefore] = useState('30');
  const [isRecurring, setIsRecurring] = useState(false);
  const [occurrences, setOccurrences] = useState('8');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  // حالة مودال تعديل عدد الحصص في الشهر
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [sessionsPerMonthInput, setSessionsPerMonthInput] = useState('');
  const [presentThisMonth, setPresentThisMonth] = useState(0);

  const load = useCallback(async () => {
    try {
      const s = await api.getStudentById(studentId);
      setStudent(s);
      const [sessionsData, paymentsData, attHistory, attStats, eventsData, presentCount] = await Promise.all([
        api.getSessions(studentId),
        api.getPaymentsByStudent(studentId),
        api.getAttendanceHistory(studentId),
        api.getAttendanceStats(studentId),
        api.getUpcomingEventsForStudent(studentId, todayISO()),
        api.getPresentCountForMonth(studentId, currentMonthYM()),
      ]);
      setSessions(sessionsData);
      setPayments(paymentsData);
      setAttendanceHistory(attHistory);
      setAttendanceStats(attStats);
      setEvents(eventsData);
      setPresentThisMonth(presentCount);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !student) return <LoadingView />;

  const latestPayment = payments[0];
  const currentMonth = currentMonthYM();
  const currentMonthPayment = payments.find((p) => p.month === currentMonth);

  const todayStatus: AttendanceStatus | null =
    attendanceHistory.find((a) => a.date === todayISO())?.status ?? null;

  const remainingSessions = student.sessions_per_month != null ? student.sessions_per_month - presentThisMonth : null;

  const openSessionsModal = () => {
    setSessionsPerMonthInput(student.sessions_per_month != null ? String(student.sessions_per_month) : '');
    setSessionsModalVisible(true);
  };

  const saveSessionsPerMonth = async () => {
    try {
      const value = sessionsPerMonthInput.trim() ? Number(sessionsPerMonthInput) : null;
      await api.updateStudent(studentId, { sessions_per_month: value });
      setSessionsModalVisible(false);
      load();
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  };

  const markTodayAttendance = async (status: AttendanceStatus) => {
    try {
      await api.saveAttendance(todayISO(), [{ student_id: studentId, status }]);
      load();
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  };

  const registerPayment = async () => {
    try {
      if (!currentMonthPayment) {
        const created = await api.createPayment({
          student_id: studentId,
          month: currentMonth,
          amount: student.monthly_fee,
          status: 'due',
        });
        if (created) await api.markPaymentPaid(created.id, { method: 'نقدي' });
      } else if (currentMonthPayment.status !== 'paid') {
        await api.markPaymentPaid(currentMonthPayment.id, { method: 'نقدي' });
      } else {
        Alert.alert('تم بالفعل', 'الاشتراك ده متسجل مدفوع أصلاً');
        return;
      }
      Alert.alert('تم', 'تم تسجيل الدفع بنجاح');
      load();
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  };

  const addEvent = async () => {
    try {
      const eventDate = dateToYMD(dateValue);
      const eventTime = timeToHHMM(timeValue);
      const minutes = Number(minutesBefore) || 30;

      if (isRecurring) {
        const count = Math.max(1, Number(occurrences) || 8);
        const createdEvents = await api.createRecurringWeeklyEvents({
          title: student.name,
          event_date: eventDate,
          event_time: eventTime,
          student_id: studentId,
          occurrences: count,
        });
        let anyPermissionDenied = false;
        for (const created of createdEvents) {
          const reminder = await scheduleEventReminder({
            uid: `event-${created.id}`,
            title: student.name,
            eventDate: created.event_date,
            eventTime,
            minutesBefore: minutes,
          });
          if (reminder.status === 'permission-denied') anyPermissionDenied = true;
        }
        if (anyPermissionDenied) {
          Alert.alert('تم حفظ المواعيد', 'لكن إذن الإشعارات مش مفعّل، فمش هتوصلك تذكيرات. فعّله من شاشة الإعدادات.');
        }
      } else {
        const created = await api.createEvent({
          title: student.name,
          event_date: eventDate,
          event_time: eventTime,
          student_id: studentId,
        });
        if (created) {
          const reminder = await scheduleEventReminder({
            uid: `event-${created.id}`,
            title: student.name,
            eventDate,
            eventTime,
            minutesBefore: minutes,
          });
          if (reminder.status === 'permission-denied') {
            Alert.alert('تم حفظ الموعد', 'لكن إذن الإشعارات مش مفعّل، فمش هتوصلك تذكيرات. فعّله من شاشة الإعدادات.');
          }
        }
      }
      setModalVisible(false);
      setIsRecurring(false);
      load();
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  };

  const cancelEvent = (event: CalendarEvent) => {
    if (event.recurrence_id) {
      Alert.alert('اعتذار عن الحصة', `الموعد ده جزء من سلسلة متكررة. عايز تلغي إيه؟`, [
        { text: 'رجوع', style: 'cancel' },
        {
          text: 'الموعد ده بس',
          onPress: async () => {
            try {
              await api.deleteEvent(event.id);
              await cancelAlarm(`event-${event.id}`);
              load();
            } catch (e) {
              Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
            }
          },
        },
        {
          text: 'كل السلسلة القادمة',
          style: 'destructive',
          onPress: async () => {
            try {
              const futureEvents = events.filter((e) => e.recurrence_id === event.recurrence_id);
              for (const e of futureEvents) await cancelAlarm(`event-${e.id}`);
              await api.deleteEventSeriesFrom(event.recurrence_id!, event.event_date);
              load();
            } catch (e) {
              Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
            }
          },
        },
      ]);
      return;
    }
    Alert.alert('اعتذار عن الحصة', `متأكد إنك عايز تلغي موعد ${event.event_date}؟`, [
      { text: 'رجوع', style: 'cancel' },
      {
        text: 'إلغاء الموعد',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEvent(event.id);
            await cancelAlarm(`event-${event.id}`);
            load();
          } catch (e) {
            Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
          }
        },
      },
    ]);
  };

  const deleteStudentConfirm = () => {
    Alert.alert(
      'حذف الطالب',
      `متأكد إنك عايز تمسح "${student.name}"؟ ده هيمسح كل بياناته (الحضور، الحفظ، الاشتراكات، المواعيد) ومينفعش يتراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteStudent(studentId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.halaqaSubtitle}>{student.halaqa_name || 'بدون حلقة'}{student.phone ? ` — ${student.phone}` : ''}</Text>

        {/* بيانات أساسية */}
        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.sm }}>
          <StatCard label="نسبة الحضور" value={`${attendanceStats.percentage}%`} />
          <StatCard label="جلسات الحفظ" value={sessions.length} />
          <StatCard label="الاشتراك الشهري" value={`${student.monthly_fee} ج.م`} />
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
          {remainingSessions !== null ? (
            <View style={{ flex: 1 }}>
              <StatCard
                label="الحصص المتبقية هذا الشهر"
                value={`${remainingSessions < 0 ? 0 : remainingSessions} / ${student.sessions_per_month}`}
              />
            </View>
          ) : (
            <Text style={{ flex: 1, color: colors.textMuted, textAlign: 'right', fontSize: 12 }}>
              عدد الحصص في الشهر مش متحدد لسه
            </Text>
          )}
          <TouchableOpacity onPress={openSessionsModal} style={styles.editSessionsBtn}>
            <Text style={styles.editSessionsBtnText}>تعديل</Text>
          </TouchableOpacity>
        </View>

        {/* حضور اليوم */}
        <SectionHeader title="حضور اليوم" />
        <View style={{ flexDirection: 'row-reverse', gap: 6, marginBottom: spacing.md }}>
          <TouchableOpacity
            onPress={() => markTodayAttendance('present')}
            style={[styles.attendanceBtn, todayStatus === 'present' && styles.attendancePresentOn]}
          >
            <Text style={[styles.attendanceBtnText, todayStatus === 'present' && { color: colors.success }]}>حاضر النهاردة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => markTodayAttendance('absent')}
            style={[styles.attendanceBtn, todayStatus === 'absent' && styles.attendanceAbsentOn]}
          >
            <Text style={[styles.attendanceBtnText, todayStatus === 'absent' && { color: colors.danger }]}>غائب النهاردة</Text>
          </TouchableOpacity>
        </View>

        {/* الاشتراك */}
        <SectionHeader title="الاشتراك" />
        {currentMonthPayment?.status !== 'paid' && (
          <View style={styles.overdueBanner}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={styles.overdueText}>الاشتراك متأخر عن شهر {currentMonth}</Text>
          </View>
        )}
        <View style={{ marginBottom: spacing.sm }}>
          <PrimaryButton
            title={currentMonthPayment?.status === 'paid' ? `مدفوع شهر ${currentMonth} ✓` : `تسجيل دفع شهر ${currentMonth}`}
            onPress={registerPayment}
            disabled={currentMonthPayment?.status === 'paid'}
          />
        </View>
        {latestPayment ? (
          <Row
            left={latestPayment.month}
            subtitle={`${latestPayment.amount} ج.م`}
            right={<Badge text={latestPayment.status === 'paid' ? 'مدفوع' : 'متأخر'} type={latestPayment.status === 'paid' ? 'success' : 'warning'} />}
          />
        ) : (
          <EmptyLine text="لا يوجد سجل اشتراكات بعد" />
        )}
        {payments.slice(1, 4).map((p) => (
          <Row
            key={p.id}
            left={p.month}
            subtitle={`${p.amount} ج.م`}
            right={<Badge text={p.status === 'paid' ? 'مدفوع' : 'متأخر'} type={p.status === 'paid' ? 'success' : 'warning'} />}
          />
        ))}

        {/* المواعيد */}
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>المواعيد القادمة</Text>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <PrimaryButton title="+ إضافة موعد" onPress={() => setModalVisible(true)} />
        </View>
        {events.length === 0 ? (
          <EmptyLine text="لا يوجد مواعيد قادمة" />
        ) : (
          events.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View style={{ flex: 1 }}>
                <Row left={e.title} subtitle={`${e.event_date}${e.event_time ? ` — ${formatTime12h(e.event_time)}` : ''}`} />
              </View>
              <TouchableOpacity onPress={() => cancelEvent(e)} style={{ marginTop: -8 }}>
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>اعتذار</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* الحفظ والمراجعة */}
        <SectionHeader title="الحفظ والمراجعة" />
        {sessions.length === 0 ? (
          <EmptyLine text="لا يوجد سجل حفظ بعد" />
        ) : (
          sessions.slice(0, 6).map((s) => (
            <Row
              key={s.id}
              left={`${s.surah || ''}${s.ayah_from ? ` (${s.ayah_from}-${s.ayah_to || ''})` : ''}`}
              subtitle={`${s.session_type} — ${s.date}`}
              right={s.evaluation ? <Badge text={s.evaluation} type={s.evaluation === 'يحتاج مراجعة' ? 'warning' : 'success'} /> : null}
            />
          ))
        )}

        {/* الحضور والغياب */}
        <SectionHeader title="الحضور والغياب" />
        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginBottom: spacing.sm }}>
          <StatCard label="أيام حضور" value={attendanceStats.present} />
          <StatCard label="أيام غياب" value={attendanceStats.absent} />
        </View>
        {attendanceHistory.length === 0 ? (
          <EmptyLine text="لا يوجد سجل حضور بعد" />
        ) : (
          attendanceHistory.slice(0, 8).map((a) => (
            <Row
              key={a.id}
              left={a.date}
              right={<Badge text={a.status === 'present' ? 'حاضر' : 'غائب'} type={a.status === 'present' ? 'success' : 'danger'} />}
            />
          ))
        )}

        {/* حذف الطالب */}
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
          <PrimaryButton title="حذف الطالب" outline onPress={deleteStudentConfirm} />
        </View>
      </ScrollView>

      {/* مودال إضافة موعد */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>إضافة موعد لـ {student.name}</Text>

              <Text style={styles.label}>التاريخ</Text>
              {Platform.OS === 'android' && (
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                  <Text>{dateToYMD(dateValue)}</Text>
                </TouchableOpacity>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={dateValue}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setDateValue(date);
                  }}
                />
              )}

              <Text style={styles.label}>الوقت</Text>
              {Platform.OS === 'android' && (
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                  <Text>{formatTime12h(timeToHHMM(timeValue))}</Text>
                </TouchableOpacity>
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={timeValue}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowTimePicker(false);
                    if (date) setTimeValue(date);
                  }}
                />
              )}

              <Text style={styles.label}>التنبيه قبل الميعاد بكام دقيقة؟</Text>
              <TextInput
                style={styles.input}
                value={minutesBefore}
                onChangeText={setMinutesBefore}
                keyboardType="numeric"
                textAlign="right"
                placeholder="30"
              />

              <TouchableOpacity
                onPress={() => setIsRecurring((v) => !v)}
                style={[styles.recurringToggle, isRecurring && styles.recurringToggleOn]}
              >
                <Text style={[styles.recurringToggleText, isRecurring && { color: colors.pinkDark }]}>
                  {isRecurring ? '✓ ' : ''}يتكرر أسبوعيًا (نفس اليوم والوقت)
                </Text>
              </TouchableOpacity>

              {isRecurring && (
                <>
                  <Text style={styles.label}>عدد مرات التكرار (أسابيع)</Text>
                  <TextInput
                    style={styles.input}
                    value={occurrences}
                    onChangeText={setOccurrences}
                    keyboardType="numeric"
                    textAlign="right"
                    placeholder="8"
                  />
                </>
              )}

              <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}><PrimaryButton title="حفظ" onPress={addEvent} /></View>
                <View style={{ flex: 1 }}><PrimaryButton title="إلغاء" outline onPress={() => setModalVisible(false)} /></View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* مودال تعديل عدد الحصص في الشهر */}
      <Modal visible={sessionsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>عدد الحصص في الشهر</Text>
            <Text style={styles.label}>عدد الحصص المتفق عليها شهريًا لـ {student.name}</Text>
            <TextInput
              style={styles.input}
              value={sessionsPerMonthInput}
              onChangeText={setSessionsPerMonthInput}
              keyboardType="numeric"
              textAlign="right"
              placeholder="مثال: 8 (سيبه فاضي لو مش عايز تحدد)"
            />
            <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}><PrimaryButton title="حفظ" onPress={saveSessionsPerMonth} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="إلغاء" outline onPress={() => setSessionsModalVisible(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  halaqaSubtitle: { color: colors.textMuted, textAlign: 'right', marginBottom: spacing.md, fontSize: 13 },
  sectionTitle: {
    fontWeight: '800', color: colors.pinkDark, marginTop: spacing.lg, marginBottom: spacing.sm, textAlign: 'right',
  },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm, fontSize: 12 },
  attendanceBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#fafafa', borderWidth: 1, borderColor: colors.border,
  },
  attendancePresentOn: { backgroundColor: colors.successBg, borderColor: '#c8e6c9' },
  attendanceAbsentOn: { backgroundColor: colors.dangerBg, borderColor: '#ffcdd2' },
  attendanceBtnText: { color: '#999', fontWeight: '700' },
  overdueBanner: {
    backgroundColor: colors.dangerBg, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
  },
  overdueText: { color: colors.danger, fontWeight: '700', flex: 1, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontWeight: '800', fontSize: 16, color: colors.pinkDark, textAlign: 'right', marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 4, marginTop: spacing.sm, color: colors.textDark },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm,
  },
  pickerBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 12, marginBottom: spacing.sm, alignItems: 'flex-end',
  },
  recurringToggle: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    padding: 12, marginBottom: spacing.sm, backgroundColor: '#fafafa',
  },
  recurringToggleOn: { backgroundColor: colors.pinkLight, borderColor: colors.pinkSoft },
  recurringToggleText: { textAlign: 'right', color: colors.textDark, fontWeight: '700', fontSize: 13 },
  editSessionsBtn: {
    borderWidth: 1.5, borderColor: colors.pink, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  editSessionsBtnText: { color: colors.pinkDark, fontWeight: '700', fontSize: 12 },
});
