import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { TopBar, Row, EmptyState, Badge } from '../components';
import api from '../api';
import { formatTime12h, dateToYMD } from '../utils/time';
import type { CalendarEvent } from '../types';

export default function CalendarScreen() {
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const today = dateToYMD(new Date());

  const load = useCallback(async () => {
    try {
      const month = today.slice(0, 7);
      const data = await api.getEvents(month);
      setDayEvents(data.filter((e) => e.event_date === today));
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="مواعيد النهاردة" subtitle={today} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {dayEvents.length === 0 ? (
          <EmptyState message="مفيش مواعيد النهاردة" />
        ) : (
          dayEvents.map((e) => (
            <View key={e.id} style={styles.eventCard}>
              <Row left={e.student_name || e.title} subtitle={formatTime12h(e.event_time)} />
              {e.student_name ? (
                <View style={{ marginTop: -4, marginBottom: spacing.sm }}>
                  <Badge text={e.student_name} type="success" />
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  eventCard: { marginBottom: spacing.xs },
});
