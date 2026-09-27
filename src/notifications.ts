// notifications.ts
// إشعارات محلية بالكامل عن طريق notifee — بتدعم "منبّه" حقيقي بيفضل يرن لحد ما تدوسه.
// ملحوظة: notifee مكتبة Native حقيقية، يعني مش هتشتغل جوه تطبيق Expo Go خالص —
// لازم Development Build أو الـ APK النهائي (زي باقي المكتبات الأصلية في المشروع ده).
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// ملحوظة: أندرويد بيقفل إعدادات القناة (زي الفئة/الصوت) بمجرد إنشائها بنفس الـ id،
// وميقبلش تعديلها بعد كده حتى لو غيّرنا الكود. عشان كده لما غيّرنا الفئة من "منبّه"
// (Alarm) لـ "تذكير" (Reminder) عشان تسمح بتغيير النغمة من الإعدادات، غيّرنا الـ id
// كمان لقناة جديدة تمامًا (v2) بدل ما نستخدم نفس القناة القديمة المقفولة.
const ALARM_CHANNEL_ID = 'alarms_v2';

// عناوين ومحتوى عام (Generic) مقصود — عشان اسم الطالب ما يظهرش على الشاشة المقفولة
// (قاعدة أمان: تفاصيل حساسة متظهرش قبل فتح القفل)
const GENERIC_TITLE = '⏰ تذكير بموعد';
const GENERIC_BODY = 'افتح التطبيق لتفاصيل الموعد';

async function ensureAlarmChannel(): Promise<string> {
  const notifee = (await import('@notifee/react-native')).default;
  return notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: 'منبّهات المواعيد',
    importance: 4, // AndroidImportance.HIGH
    sound: 'default',
    vibration: true,
  });
}

/** لازم تتنادى مرة عند فتح التطبيق (App.tsx) قبل أي جدولة إشعارات */
export async function setupNotifications(): Promise<boolean> {
  if (isExpoGo) {
    console.log('الإشعارات متعطلة داخل Expo Go — هتشتغل عادي في الـ APK أو Development Build.');
    return false;
  }
  const notifee = (await import('@notifee/react-native')).default;
  await ensureAlarmChannel();
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1; // AUTHORIZED أو PROVISIONAL
}

export type ReminderResult =
  | { status: 'scheduled'; id: string; fireDate: Date }
  | { status: 'immediate'; id: string; fireDate: Date }
  | { status: 'event-passed' }
  | { status: 'permission-denied' }
  | { status: 'not-supported' };

/**
 * منبّه حقيقي بيفضل يرن ويظهر فوق أي حاجة لحد ما تدوس "إيقاف" — بدل إشعار عادي بيختفي لوحده.
 * بيتظهر قبل الموعد بـ minutesBefore دقيقة (افتراضيًا 30). لو الموعد أقرب من كده،
 * بيرن فورًا بدل ما يتجاهل التذكير خالص.
 */
export async function scheduleEventReminder(params: {
  uid: string;          // معرّف فريد (مثلاً: event-<id>)
  title: string;        // للعرض جوه التطبيق نفسه بس (مش هيتحط في محتوى الإشعار لأسباب خصوصية)
  eventDate: string;    // YYYY-MM-DD
  eventTime: string;    // HH:MM (24 ساعة)
  minutesBefore?: number;
}): Promise<ReminderResult> {
  if (isExpoGo) return { status: 'not-supported' };

  const { eventDate, eventTime, minutesBefore = 30 } = params;
  const [hours, minutes] = eventTime.split(':').map(Number);
  const eventDateTime = new Date(eventDate);
  eventDateTime.setHours(hours || 0, minutes || 0, 0, 0);

  if (eventDateTime.getTime() <= Date.now()) {
    return { status: 'event-passed' };
  }

  const granted = await setupNotifications();
  if (!granted) return { status: 'permission-denied' };

  let fireDate = new Date(eventDateTime.getTime() - minutesBefore * 60 * 1000);
  let status: 'scheduled' | 'immediate' = 'scheduled';
  if (fireDate.getTime() <= Date.now()) {
    fireDate = new Date(Date.now() + 3000);
    status = 'immediate';
  }

  const notifee = (await import('@notifee/react-native')).default;
  const { AndroidCategory, AndroidVisibility, TriggerType } = await import('@notifee/react-native');

  await notifee.createTriggerNotification(
    {
      id: params.uid,
      title: GENERIC_TITLE,
      body: GENERIC_BODY,
      android: {
        channelId: ALARM_CHANNEL_ID,
        category: AndroidCategory.REMINDER,
        visibility: AndroidVisibility.PRIVATE, // محتوى مخفي على الشاشة المقفولة
        ongoing: true,       // مايتشالش بالسحب العادي
        loopSound: true,     // الصوت يفضل يرن متكرر لحد ما تدوس إيقاف
        autoCancel: false,
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'default' },
        actions: [{ title: '⏹ إيقاف', pressAction: { id: 'dismiss' } }],
      },
    },
    { type: TriggerType.TIMESTAMP, timestamp: fireDate.getTime(), alarmManager: true }
  );

  return { status, id: params.uid, fireDate };
}

/** إلغاء منبّه معيّن بالـ uid بتاعه (مثلاً لما تلغي/تمسح الموعد) */
export async function cancelAlarm(uid: string): Promise<void> {
  if (isExpoGo) return;
  const notifee = (await import('@notifee/react-native')).default;
  await notifee.cancelNotification(uid);
}

/** إرسال إشعار اختباري فوري — للتأكد إن الإشعارات شغالة صح على الجهاز */
export async function sendTestNotification(): Promise<'sent' | 'permission-denied' | 'not-supported'> {
  if (isExpoGo) return 'not-supported';
  const granted = await setupNotifications();
  if (!granted) return 'permission-denied';

  const notifee = (await import('@notifee/react-native')).default;
  const { AndroidCategory } = await import('@notifee/react-native');
  await notifee.displayNotification({
    title: '✅ اختبار الإشعارات',
    body: 'لو شفت الإشعار ده، يبقى الإشعارات شغالة تمام',
    android: { channelId: ALARM_CHANNEL_ID, category: AndroidCategory.REMINDER },
  });
  return 'sent';
}

/** هل الإشعارات شغالة دلوقتي (يعني مش جوه Expo Go)؟ */
export function isNotificationsSupported(): boolean {
  return !isExpoGo;
}

/** حالة إذن الإشعارات الحالية، من غير ما تطلب الإذن. بترجع null لو جوه Expo Go */
export async function getNotificationPermissionStatus(): Promise<boolean | null> {
  if (isExpoGo) return null;
  const notifee = (await import('@notifee/react-native')).default;
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= 1;
}
