// security.ts
// قفل التطبيق: كود PIN (مخزّن كـ hash مش نص صريح) + بصمة/وجه اختياري.
// الهدف: أي حد يمسك الموبايل من غير قفل التطبيق نفسه ما يقدرش يشوف بيانات الطلاب.
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { getDb } from './api/db';

const PIN_KEY = 'app_pin_hash';
const LOCK_ENABLED_KEY = 'app_lock_enabled';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

/** هل المستخدم فعّل قفل التطبيق أصلاً؟ */
export async function isLockEnabled(): Promise<boolean> {
  const value = await getSetting(LOCK_ENABLED_KEY);
  return value === 'true';
}

/** تعيين/تغيير كود الـ PIN وتفعيل القفل */
export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await setSetting(PIN_KEY, hash);
  await setSetting(LOCK_ENABLED_KEY, 'true');
}

/** إلغاء القفل تمامًا */
export async function disableLock(): Promise<void> {
  await setSetting(LOCK_ENABLED_KEY, 'false');
}

/** التحقق من كود الـ PIN المدخل */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await getSetting(PIN_KEY);
  if (!storedHash) return false;
  const inputHash = await hashPin(pin);
  return inputHash === storedHash;
}

/** هل جهاز المستخدم بيدعم بصمة/وجه، وفيه بيانات بيومترية متسجلة؟ */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

/** طلب فتح القفل بالبصمة/الوجه */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'افتح التطبيق',
    cancelLabel: 'إلغاء',
    fallbackLabel: 'استخدم الكود',
  });
  return result.success;
}
