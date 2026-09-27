// backup.ts
// نسخ احتياطي **مشفّر** لقاعدة البيانات المحلية — الملف الناتج مقفول بكلمة سر،
// فحتى لو اتبعت غلط أو ضاع، محدش يقدر يفتحه من غير الباسورد.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import CryptoJS from 'crypto-js';

const DB_FILE_NAME = 'quran_app.db';

function getDbPath(): string {
  // ده نفس المكان اللي expo-sqlite بيحفظ فيه قاعدة البيانات
  return `${FileSystem.documentDirectory}SQLite/${DB_FILE_NAME}`;
}

/** تصدير نسخة مشفّرة من قاعدة البيانات ومشاركتها عن طريق أي تطبيق تاني على الموبايل */
export async function exportBackup(password: string): Promise<void> {
  if (!password || password.length < 4) {
    throw new Error('كلمة السر لازم تكون 4 أحرف/أرقام على الأقل');
  }

  const dbPath = getDbPath();
  const info = await FileSystem.getInfoAsync(dbPath);
  if (!info.exists) {
    throw new Error('لسه معملتش أي بيانات في التطبيق عشان تعمل نسخة احتياطية منها');
  }

  const base64Content = await FileSystem.readAsStringAsync(dbPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const encrypted = CryptoJS.AES.encrypt(base64Content, password).toString();

  const timestamp = new Date().toISOString().slice(0, 10);
  const backupPath = `${FileSystem.cacheDirectory}halaqty-backup-${timestamp}.enc`;
  await FileSystem.writeAsStringAsync(backupPath, encrypted, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('المشاركة مش متاحة على الجهاز ده');
  }

  await Sharing.shareAsync(backupPath, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'حفظ نسخة احتياطية مشفّرة من بيانات حلقتي',
  });
}

/** استيراد نسخة احتياطية مشفّرة سبق تصديرها (بتستبدل البيانات الحالية بالكامل) */
export async function importBackup(pickedFileUri: string, password: string): Promise<void> {
  const encryptedContent = await FileSystem.readAsStringAsync(pickedFileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let base64Content: string;
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, password);
    base64Content = decrypted.toString(CryptoJS.enc.Utf8);
    if (!base64Content) throw new Error('empty');
  } catch (e) {
    throw new Error('كلمة السر غلط أو الملف تالف');
  }

  const dbPath = getDbPath();
  const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
  const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(dbPath, base64Content, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
