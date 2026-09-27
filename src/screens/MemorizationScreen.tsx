import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import { TopBar, PrimaryButton, Row, Badge } from '../components';
import api from '../api';
import { dateToYMD } from '../utils/time';
import type { Student, MemorizationSession, SessionType, Evaluation } from '../types';

const SESSION_TYPES: SessionType[] = ['حفظ جديد', 'مراجعة صغرى', 'مراجعة كبرى', 'تجويد'];
const EVALUATIONS: Evaluation[] = ['ممتاز', 'جيد', 'يحتاج مراجعة'];

function todayISO(): string {
  return dateToYMD(new Date());
}

export default function MemorizationScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>(SESSION_TYPES[0]);
  const [surah, setSurah] = useState('');
  const [ayahFrom, setAyahFrom] = useState('');
  const [ayahTo, setAyahTo] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation>(EVALUATIONS[0]);
  const [notes, setNotes] = useState('');
  const [nextTarget, setNextTarget] = useState('');
  const [history, setHistory] = useState<MemorizationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getStudents();
      setStudents(data);
      if (data.length && !selectedStudent) setSelectedStudent(data[0].id);
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [selectedStudent]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useFocusEffect(
    useCallback(() => {
      if (!selectedStudent) return;
      api.getSessions(selectedStudent).then(setHistory).catch(() => {});
    }, [selectedStudent])
  );

  const save = async () => {
    if (!selectedStudent || !surah.trim()) {
      Alert.alert('تنبيه', 'اختار الطالب واكتب اسم السورة');
      return;
    }
    setSaving(true);
    try {
      await api.createSession({
        student_id: selectedStudent,
        date: todayISO(),
        session_type: sessionType,
        surah: surah.trim(),
        ayah_from: ayahFrom ? Number(ayahFrom) : null,
        ayah_to: ayahTo ? Number(ayahTo) : null,
        evaluation,
        notes: notes.trim() || null,
        next_target: nextTarget.trim() || null,
      });
      setSurah(''); setAyahFrom(''); setAyahTo(''); setNotes(''); setNextTarget('');
      const updated = await api.getSessions(selectedStudent);
      setHistory(updated);
      Alert.alert('تم', 'تم حفظ المتابعة بنجاح');
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="متابعة الحفظ" subtitle={todayISO()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>الطالب</Text>
          {loading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'right', marginBottom: spacing.md }}>جاري تحميل الطلاب...</Text>
          ) : students.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'right', marginBottom: spacing.md }}>لسه معملتش أي طالب</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                {students.map((s) => (
                  <Chip key={s.id} label={s.name} active={selectedStudent === s.id} onPress={() => setSelectedStudent(s.id)} />
                ))}
              </View>
            </ScrollView>
          )}

        <Text style={styles.label}>نوع الحصة</Text>
        <View style={styles.chipRow}>
          {SESSION_TYPES.map((t) => (
            <Chip key={t} label={t} active={sessionType === t} onPress={() => setSessionType(t)} />
          ))}
        </View>

        <Text style={styles.label}>السورة</Text>
        <TextInput style={styles.input} value={surah} onChangeText={setSurah} placeholder="مثال: سورة البقرة" textAlign="right" />

        <View style={{ flexDirection: 'row-reverse', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>من آية</Text>
            <TextInput style={styles.input} value={ayahFrom} onChangeText={setAyahFrom} keyboardType="numeric" textAlign="right" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>إلى آية</Text>
            <TextInput style={styles.input} value={ayahTo} onChangeText={setAyahTo} keyboardType="numeric" textAlign="right" />
          </View>
        </View>

        <Text style={styles.label}>تقييم التسميع</Text>
        <View style={styles.chipRow}>
          {EVALUATIONS.map((e) => (
            <Chip key={e} label={e} active={evaluation === e} onPress={() => setEvaluation(e)} />
          ))}
        </View>

        <Text style={styles.label}>ملاحظات المعلم</Text>
        <TextInput style={[styles.input, { height: 70 }]} value={notes} onChangeText={setNotes} multiline textAlign="right" placeholder="أخطاء التجويد وغيرها..." />

        <Text style={styles.label}>الحفظ المطلوب للحصة القادمة</Text>
        <TextInput style={styles.input} value={nextTarget} onChangeText={setNextTarget} placeholder="مثال: سورة البقرة من 11 إلى 20" textAlign="right" />

        <View style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
          <PrimaryButton title={saving ? 'جاري الحفظ...' : 'حفظ المتابعة'} onPress={save} disabled={saving} />
        </View>

        <Text style={styles.sectionTitle}>سجل الحفظ السابق</Text>
        {history.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>لا يوجد سجل بعد لهذا الطالب</Text>
        ) : (
          history.map((h) => (
            <Row
              key={h.id}
              left={`${h.surah || ''} ${h.ayah_from ? `(${h.ayah_from}-${h.ayah_to || ''})` : ''}`}
              subtitle={`${h.session_type} — ${h.date}`}
              right={h.evaluation ? <Badge text={h.evaluation} type={h.evaluation === 'يحتاج مراجعة' ? 'warning' : 'success'} /> : null}
            />
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}
function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.textDark, textAlign: 'right', marginBottom: 4, marginTop: spacing.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: colors.pink, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.pink },
  chipText: { color: colors.pinkDark, fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sectionTitle: { fontWeight: '800', color: colors.pinkDark, marginBottom: spacing.sm, marginTop: spacing.sm, textAlign: 'right' },
});
