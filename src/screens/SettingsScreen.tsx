import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, radius } from '../theme';
import { TopBar, PrimaryButton, Badge } from '../components';
import { exportBackup, importBackup } from '../backup';
import { setupNotifications, getNotificationPermissionStatus, isNotificationsSupported, sendTestNotification } from '../notifications';
import { isLockEnabled, setPin, disableLock, isBiometricAvailable } from '../security';

export default function SettingsScreen() {
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testing, setTesting] = useState(false);
  const notifSupported = isNotificationsSupported();

  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [pendingImportUri, setPendingImportUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const granted = await getNotificationPermissionStatus();
    setNotifGranted(granted);
    setLockEnabled(await isLockEnabled());
    setBiometricAvailable(await isBiometricAvailable());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const requestNotifPermission = async () => {
    const granted = await setupNotifications();
    setNotifGranted(granted);
    if (!granted) {
      Alert.alert('الإذن مرفوض', 'من غير إذن الإشعارات مش هتقدر تستقبل تذكيرات بمواعيد الحلقات.');
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const result = await sendTestNotification();
      if (result === 'sent') {
        Alert.alert('تم الإرسال', 'المفروض يوصلك إشعار خلال ثواني.');
      } else if (result === 'permission-denied') {
        Alert.alert('الإذن مرفوض', 'فعّل إذن الإشعارات الأول.');
      }
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setTesting(false);
    }
  };

  const savePin = async () => {
    if (newPin.length < 4) {
      Alert.alert('تنبيه', 'الكود لازم يكون 4 أرقام على الأقل');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('خطأ', 'الكودين مش متطابقين');
      return;
    }
    await setPin(newPin);
    setLockEnabled(true);
    setPinModalVisible(false);
    setNewPin('');
    setConfirmPin('');
    Alert.alert('تم', 'اتفعّل قفل التطبيق بنجاح');
  };

  const handleDisableLock = () => {
    Alert.alert('إلغاء القفل', 'متأكد إنك عايز تلغي قفل التطبيق؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تأكيد',
        style: 'destructive',
        onPress: async () => {
          await disableLock();
          setLockEnabled(false);
        },
      },
    ]);
  };

  const handleExport = async () => {
    if (exportPassword.length < 4) {
      Alert.alert('تنبيه', 'كلمة السر لازم تكون 4 أحرف/أرقام على الأقل');
      return;
    }
    setExporting(true);
    try {
      await exportBackup(exportPassword);
      setExportModalVisible(false);
      setExportPassword('');
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setExporting(false);
    }
  };

  const pickImportFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    setPendingImportUri(result.assets[0].uri);
    setImportModalVisible(true);
  };

  const handleImport = async () => {
    if (!pendingImportUri) return;
    setImporting(true);
    try {
      await importBackup(pendingImportUri, importPassword);
      setImportModalVisible(false);
      setImportPassword('');
      setPendingImportUri(null);
      Alert.alert('تم', 'تم استيراد النسخة الاحتياطية. أغلق التطبيق وافتحه تاني عشان التغييرات تظهر.');
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="الإعدادات" subtitle="الأمان، النسخ الاحتياطي، والإشعارات" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>

        <Text style={styles.sectionTitle}>قفل التطبيق</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={styles.cardText}>حالة القفل</Text>
            <Badge text={lockEnabled ? 'مفعّل' : 'غير مفعّل'} type={lockEnabled ? 'success' : 'warning'} />
          </View>
          <Text style={[styles.cardText, { marginBottom: spacing.sm }]}>
            لما تفعّله، هتحتاج تدخل كود (أو بصمة{biometricAvailable ? '' : ' لو جهازك بيدعمها'}) كل ما تفتح التطبيق — يحمي بيانات الطلاب لو حد تاني مسك الموبايل.
          </Text>
          {lockEnabled ? (
            <PrimaryButton title="إلغاء القفل" outline onPress={handleDisableLock} />
          ) : (
            <PrimaryButton title="تفعيل قفل التطبيق" onPress={() => setPinModalVisible(true)} />
          )}
        </View>

        <Text style={styles.sectionTitle}>الإشعارات</Text>
        <View style={styles.card}>
          {!notifSupported ? (
            <Text style={styles.cardText}>
              الإشعارات مش شغالة داخل تطبيق Expo Go — هتشتغل عادي في الـ APK النهائي أو أي Development Build.
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={styles.cardText}>حالة إذن الإشعارات</Text>
                {notifGranted === null ? null : (
                  <Badge text={notifGranted ? 'مفعّل' : 'غير مفعّل'} type={notifGranted ? 'success' : 'warning'} />
                )}
              </View>
              {!notifGranted && <PrimaryButton title="تفعيل الإشعارات" onPress={requestNotifPermission} />}
              {notifGranted && (
                <PrimaryButton
                  title={testing ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
                  outline
                  onPress={handleTestNotification}
                  disabled={testing}
                />
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>نسخة احتياطية مشفّرة</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            صدّر نسخة من كل بيانات التطبيق في ملف واحد **مشفّر بكلمة سر** — حتى لو اتبعت غلط أو ضاع، محدش يقدر يفتحه من غيرها.
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton title="تصدير نسخة احتياطية" onPress={() => setExportModalVisible(true)} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardText}>
            استورد نسخة احتياطية سبق تصديرها (هتحتاج نفس كلمة السر اللي استخدمتها وقت التصدير). تنبيه: ده هيستبدل كل البيانات الحالية.
          </Text>
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton title="استيراد نسخة احتياطية" outline onPress={pickImportFile} />
          </View>
        </View>
      </ScrollView>

      {/* مودال تعيين كود القفل */}
      <Modal visible={pinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تعيين كود القفل</Text>
            <Text style={styles.label}>الكود (4 أرقام على الأقل)</Text>
            <TextInput style={styles.input} value={newPin} onChangeText={setNewPin} secureTextEntry keyboardType="numeric" textAlign="center" maxLength={6} />
            <Text style={styles.label}>تأكيد الكود</Text>
            <TextInput style={styles.input} value={confirmPin} onChangeText={setConfirmPin} secureTextEntry keyboardType="numeric" textAlign="center" maxLength={6} />
            <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}><PrimaryButton title="حفظ" onPress={savePin} /></View>
              <View style={{ flex: 1 }}><PrimaryButton title="إلغاء" outline onPress={() => setPinModalVisible(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* مودال كلمة سر التصدير */}
      <Modal visible={exportModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>كلمة سر النسخة الاحتياطية</Text>
            <Text style={styles.label}>اختار كلمة سر (هتحتاجها وقت الاستيراد تاني)</Text>
            <TextInput style={styles.input} value={exportPassword} onChangeText={setExportPassword} secureTextEntry textAlign="right" />
            <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title={exporting ? 'جاري التصدير...' : 'تصدير'} onPress={handleExport} disabled={exporting} />
              </View>
              <View style={{ flex: 1 }}><PrimaryButton title="إلغاء" outline onPress={() => setExportModalVisible(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* مودال كلمة سر الاستيراد */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>كلمة سر النسخة الاحتياطية</Text>
            <Text style={styles.label}>ادخل كلمة السر اللي استخدمتها وقت التصدير</Text>
            <TextInput style={styles.input} value={importPassword} onChangeText={setImportPassword} secureTextEntry textAlign="right" />
            <View style={{ flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title={importing ? 'جاري الاستيراد...' : 'استيراد'} onPress={handleImport} disabled={importing} />
              </View>
              <View style={{ flex: 1 }}><PrimaryButton title="إلغاء" outline onPress={() => setImportModalVisible(false)} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontWeight: '800', color: colors.pinkDark, marginBottom: spacing.sm, textAlign: 'right' },
  card: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    padding: spacing.md, marginBottom: spacing.lg, backgroundColor: '#fafafa',
  },
  cardText: { color: colors.textDark, fontSize: 13, textAlign: 'right', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontWeight: '800', fontSize: 16, color: colors.pinkDark, textAlign: 'right', marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.textDark, textAlign: 'right', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md,
  },
});
