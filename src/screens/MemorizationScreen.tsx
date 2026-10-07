import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import { TopBar, PrimaryButton, Row, Badge } from '../components';
import api from '../api';
import { dateToYMD } from '../utils/time';
import type { Student, MemorizationSession, Evaluation } from '../types';

const EVALUATIONS: Evaluation[] = ['ممتاز', 'جيد', 'يحتاج مراجعة'];

function todayISO(): string {
  return dateToYMD(new Date());
}

// شكل بيانات كل قسم (تسميع / مراجعة قريب / مراجعة بعيد) لوحده
interface SectionState {
  surah: string;
  ayahFrom: string;
  ayahTo: string;
  evaluation: Evaluation;
}
const emptySection: SectionState = { surah: '', ayahFrom: '', ayahTo: '', evaluation: EVALUATIONS[0] };

const SECTIONS = [
  { key: 'new', sessionType: 'تسميع', title: 'تسميع' },
  { key: 'near', sessionType: 'مراجعة قريب', title: 'تسميع مراجعة قريب' },
  { key: 'far', sessionType: 'مراجعة بعيد', title: 'تسميع مراجعة بعيد' },
] as const;
type SectionKey = typeof SECTIONS[number]['key'];

export default function MemorizationScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [history, setHistory] = useState<MemorizationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حالة منفصلة لكل قسم - عشان متتكتبش فوق بعض
  const [sectionsData, setSectionsData] = useState<Record<SectionKey, SectionState>>({
    new: { ...emptySection },
    near: { ...emptySection },
    far: { ...emptySection },
  });

  const updateSection = (key: SectionKey, patch: Partial<SectionState>) => {
    setSectionsData((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

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

  const refreshHistory = useCallback(() => {
    if (!selectedStudent) return;
    api.getSessions(selectedStudent).then(setHistory).catch(() => { });
  }, [selectedStudent]);

  useFocusEffect(useCallback(() => { refreshHistory(); }, [refreshHistory]));

  // زرار واحد بيحفظ أي قسم اتكتبله سورة، ويتجاهل الأقسام الفاضية
  const saveAll = async () => {
    if (!selectedStudent) return;

    const toSave = SECTIONS.filter((s) => sectionsData[s.key].surah.trim());
    if (toSave.length === 0) {
      Alert.alert('تنبيه', 'اكتب اسم السورة في قسم واحد على الأقل');
      return;
    }

    setSaving(true);
    try {
      for (const section of toSave) {
        const data = sectionsData[section.key];
        await api.createSession({
          student_id: selectedStudent,
          date: todayISO(),
          session_type: section.sessionType,
          surah: data.surah.trim(),
          ayah_from: data.ayahFrom ? Number(data.ayahFrom) : null,
          ayah_to: data.ayahTo ? Number(data.ayahTo) : null,
          evaluation: data.evaluation,
        });
      }
      // نفضّي الأقسام اللي اتحفظت بس
      setSectionsData((prev) => {
        const next = { ...prev };
        toSave.forEach((s) => { next[s.key] = { ...emptySection }; });
        return next;
      });
      refreshHistory();
      Alert.alert('تم', `تم حفظ ${toSave.length} قسم بنجاح`);
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

          {selectedStudent && SECTIONS.map((section) => (
            <SectionFields
              key={section.key}
              title={section.title}
              data={sectionsData[section.key]}
              onChange={(patch) => updateSection(section.key, patch)}
            />
          ))}

          <View style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
            <PrimaryButton title={saving ? 'جاري الحفظ...' : 'حفظ المتابعة'} onPress={saveAll} disabled={saving || !selectedStudent} />
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

/** حقول قسم واحد بس - من غير أي حالة أو زرار حفظ داخلها، كلها بتتحكم من الشاشة الأب */
interface SectionFieldsProps {
  title: string;
  data: SectionState;
  onChange: (patch: Partial<SectionState>) => void;
}
function SectionFields({ title, data, onChange }: SectionFieldsProps) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={styles.sectionHeaderBox}>
        <Text style={styles.sectionHeaderBoxText}>{title}</Text>
      </View>

      <Text style={styles.label}>السورة</Text>
      <TextInput
        style={styles.input}
        value={data.surah}
        onChangeText={(v) => onChange({ surah: v })}
        placeholder="مثال: سورة البقرة"
        textAlign="right"
      />

      <View style={{ flexDirection: 'row-reverse', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>من آية</Text>
          <TextInput style={styles.input} value={data.ayahFrom} onChangeText={(v) => onChange({ ayahFrom: v })} keyboardType="numeric" textAlign="right" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>إلى آية</Text>
          <TextInput style={styles.input} value={data.ayahTo} onChangeText={(v) => onChange({ ayahTo: v })} keyboardType="numeric" textAlign="right" />
        </View>
      </View>

      <Text style={styles.label}>تقييم التسميع</Text>
      <View style={styles.chipRow}>
        {EVALUATIONS.map((e) => (
          <Chip key={e} label={e} active={data.evaluation === e} onPress={() => onChange({ evaluation: e })} />
        ))}
      </View>
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
  sectionHeaderBox: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    backgroundColor: colors.pink,
  },
  sectionHeaderBoxText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 14 },
});