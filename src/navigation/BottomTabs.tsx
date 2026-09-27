import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme';
import type { RootTabParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import StudentsStack from './StudentsStack';
import MemorizationScreen from '../screens/MemorizationScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, string> = {
  الرئيسية: 'home',
  الطلاب: 'user-friends',
  الحفظ: 'book-open',
  المواعيد: 'calendar-alt',
  الإعدادات: 'cog',
};

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.pinkDark,
        tabBarInactiveTintColor: '#b0b0b8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <FontAwesome5 name={ICONS[route.name] as any} color={color} size={size ? size - 4 : 16} />
        ),
      })}
    >
      <Tab.Screen name="الرئيسية" component={HomeScreen} />
      <Tab.Screen name="الطلاب" component={StudentsStack} />
      <Tab.Screen name="الحفظ" component={MemorizationScreen} />
      <Tab.Screen name="المواعيد" component={CalendarScreen} />
      <Tab.Screen name="الإعدادات" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
