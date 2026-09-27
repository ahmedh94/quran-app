import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import BottomTabs from './src/navigation/BottomTabs';
import SplashAnimation from './src/screens/SplashAnimation';
import LockScreen from './src/LockScreen';
import { setupNotifications } from './src/notifications';
import { isLockEnabled } from './src/security';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// فعّل الاتجاه من اليمين لليسار للتطبيق كله
// ملحوظة: أول مرة تشغل التطبيق ممكن يحتاج إعادة تحميل (reload) عشان الإعداد ده يتطبق فعليًا
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// نمنع شاشة البداية الأصلية (Native) من الاختفاء تلقائيًا قبل ما نكون جاهزين —
// ده اللي بيصلح مشكلة "الشاشة الفاضية" اللي بتظهر قبل اللوجو: بدل ما الشاشة تختفي
// بدري وتسيب فجوة بيضا فاضية لحد ما الكود يجهز، هي بتفضل ظاهرة (بنفس صورتك) لحد
// ما إحنا نقوله يدويًا "خلاص جاهزين" (hideAsync تحت).
SplashScreen.preventAutoHideAsync().catch(() => {});

// تسجيل هاندلر زرار "إيقاف" بتاع المنبّه — لازم يكون هنا في أعلى الملف (خارج أي
// كومبوننت) عشان يشتغل حتى لو التطبيق قافل تمامًا وقت ما المنبّه يرن.
if (!isExpoGo) {
  import('@notifee/react-native').then(({ default: notifee, EventType }) => {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'dismiss' && detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    });
  });
}

export default function App() {
  const [showAnimation, setShowAnimation] = useState(true);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      // بنسيب شاشة البداية الأصلية تختفي فورًا، وشاشة الأنيميشن بتاخد مكانها على
      // طول (نفس الصورة والخلفية) عشان محدش يشوف أي فجوة فاضية بينهم
      await SplashScreen.hideAsync().catch(() => {});

      setupNotifications();
      const lockOn = await isLockEnabled();
      setLocked(lockOn);
      setReady(true);
    })();
  }, []);

  const onSplashFinish = useCallback(() => setShowAnimation(false), []);

  if (showAnimation || !ready) {
    return <SplashAnimation onFinish={onSplashFinish} />;
  }

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <BottomTabs />
        </NavigationContainer>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
