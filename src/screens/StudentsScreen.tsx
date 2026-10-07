import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, radius, shadow } from '../theme';
import { TopBar, Row, PrimaryButton, LoadingView, EmptyState } from '../components';
import api from '../api';
import type { Student, StudentsStackParamList } from '../types';

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentsList'>;

export default function StudentsScreen({ navigation }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('200');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [halaqaId, setHalaqaId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [studentsData, halaqas] = await Promise.all([api.getStudents(), api.getHalaqas()]);
      setStudents(studentsData);
      if (halaqas.length && !halaqaId) setHalaqaId(halaqas[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [halaqaId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addStudent = async () => {
    if (!name.trim()) return;
    await api.createStudent({
      name: name.trim(),
      phone: phone.trim() || null,
      monthly_fee: Number(fee) || 200,
      halaqa_id: halaqaId,
      sessions_per_month: sessionsPerMonth.trim() ? Number(sessionsPerMonth) : null,
    });
    setName(''); setPhone(''); setFee('200'); setSessionsPerMonth('');
    setModalVisible(false);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="الطلاب" subtitle={`${students.length} طالب مسجل`} />
      <View style={{ flex: 1, padding: spacing.lg }}>
        {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.md }}>{error}</Text> : null}
        {loading ? (
          <LoadingView />
        ) : students.length === 0 ? (
          <EmptyState message="لسه معملتش أي طالب — دوس على + عشان تضيف واحد" />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => navigation.navigate('StudentDetail', { studentId: item.id, studentName: item.name })}>
                <Row left={item.name} subtitle={item.halaqa_name || 'بدون حلقة'} />
              </TouchableOpacity>
            )}
          />
        )}
        <PrimaryButton title="+ إضافة طالب جديد" onPress={() => setModalVisible(true)} />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>إضافة طالب</Text>
              <Text style={styles.label}>الاسم</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="اسم الطالب" textAlign="right" />
              <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="01xxxxxxxxx" textAlign="right" keyboardType="phone-pad" />
              <Text style={styles.label}>الاشتراك الشهري (ج.م)</Text>
              <TextInput style={styles.input} value={fee} onChangeText={setFee} keyboardType="numeric" textAlign="right" />
              <Text style={styles.label}>عدد الحصص في الشهر (اختياري)</Text>
              <TextInput style={styles.input} value={sessionsPerMonth} onChangeText={setSessionsPerMonth} keyboardType="numeric" textAlign="right" placeholder="مثال: 8" />
              <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="حفظ" onPress={addStudent} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="إلغاء" outline onPress={() => setModalVisible(false)} />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontWeight: '800', fontSize: 16, color: colors.pinkDark, textAlign: 'right', marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.textDark, textAlign: 'right', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
});
