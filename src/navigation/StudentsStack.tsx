import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import type { StudentsStackParamList } from '../types';
import StudentsScreen from '../screens/StudentsScreen';
import StudentDetailScreen from '../screens/StudentDetailScreen';

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export default function StudentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.pink },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerBackTitle: 'رجوع',
      }}
    >
      <Stack.Screen name="StudentsList" component={StudentsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={({ route }) => ({ title: route.params.studentName })}
      />
    </Stack.Navigator>
  );
}
