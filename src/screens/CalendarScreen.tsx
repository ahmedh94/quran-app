import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import api from '../api';
import { dateToYMD, formatTime12h } from '../utils/time';
import { getStudentColor } from '../utils/scheduleColors';
import type { CalendarEvent } from '../types';

const HOUR_HEIGHT = 52; // ارتفاع كل ساعة بالبكسل
const EVENT_HEIGHT = 46;

const DAY_NAMES = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/** بيرجع تواريخ أسبوع كامل (7 أيام) يبدأ يوم سبت، شامل referenceDate */
function getWeekDates(referenceDate: Date): Date[] {
  const jsDay = referenceDate.getDay(); // 0=أحد ... 6=سبت
  const diffFromSaturday = (jsDay + 1) % 7; // كام يوم فات من آخر سبت
  const saturday = new Date(referenceDate);
  saturday.setDate(referenceDate.getDate() - diffFromSaturday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(saturday);
    d.setDate(saturday.getDate() + i);
    return d;
  });
}

function getEventTopOffset(eventTime: string | null, startHour: number): number {
  if (!eventTime) return 0;
  const [h, m] = eventTime.split(':').map(Number);
  const hoursFromStart = (h - startHour) + (m || 0) / 60;
  return Math.max(0, hoursFromStart * HOUR_HEIGHT);
}

export default function CalendarScreen() {
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);
  const weekStart = dateToYMD(weekDates[0]);
  const weekEnd = dateToYMD(weekDates[6]);
  const todayStr = dateToYMD(new Date());

  const load = useCallback(async () => {
    try {
      const data = await api.getEventsForDateRange(weekStart, weekEnd);
      setEvents(data);
    } catch (e) {
      Alert.alert('خطأ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    }
  }, [weekStart, weekEnd]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goPrevWeek = () => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 7);
    setReferenceDate(d);
  };
  const goNextWeek = () => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 7);
    setReferenceDate(d);
  };

  // بنحسب نطاق الساعات ديناميكيًا من أول وآخر موعد فعلي في الأسبوع ده (+ ساعة هامش قبل وبعد)
  const { startHour, endHour } = useMemo(() => {
    if (events.length === 0) return { startHour: 8, endHour: 20 }; // نطاق افتراضي لو مفيش مواعيد خالص

    let minHour = 23;
    let maxHour = 0;
    events.forEach((e) => {
      if (!e.event_time) return;
      const [h] = e.event_time.split(':').map(Number);
      if (h < minHour) minHour = h;
      if (h + 1 > maxHour) maxHour = h + 1; // +1 عشان ناخد بالنا من مدة الحصة نفسها
    });

    return {
      startHour: Math.max(0, minHour - 1),  // ساعة هامش قبل أول موعد
      endHour: Math.min(24, maxHour + 1),   // ساعة هامش بعد آخر موعد
    };
  }, [events]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_HEIGHT;

  const monthLabel = referenceDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* الهيدر */}
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>{monthLabel}</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 50 }}>
          <TouchableOpacity onPress={goPrevWeek}>
            <FontAwesome5 name="chevron-left" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goNextWeek}>
            <FontAwesome5 name="chevron-right" size={14} color="#fff" />
          </TouchableOpacity>

        </View>
      </View>

      {/* شريط أيام الأسبوع */}
      <View style={styles.weekStrip}>
        {weekDates.map((d) => {
          const dStr = dateToYMD(d);
          const isToday = dStr === todayStr;
          return (
            <View key={dStr} style={styles.dayColHead}>
              <Text style={styles.dowText}>{DAY_NAMES[d.getDay()]}</Text>
              <View style={[styles.dayNumCircle, isToday && styles.dayNumCircleToday]}>
                <Text style={[styles.dayNumText, isToday && styles.dayNumTextToday]}>{d.getDate()}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* الشبكة */}
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.grid}>
          <View style={styles.timeCol}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT }}>
                <Text style={styles.timeLabel}>{formatTime12h(`${String(h).padStart(2, '0')}:00`)}</Text>
              </View>
            ))}
          </View>

          {weekDates.map((d) => {
            const dStr = dateToYMD(d);
            const dayEvents = events.filter((e) => e.event_date === dStr);
            return (
              <View key={dStr} style={[styles.dayCol, { height: gridHeight }]}>
                {hours.map((h) => (
                  <View key={h} style={styles.hourLine} />
                ))}
                {dayEvents.map((e) => {
                  const color = getStudentColor(e.student_id);
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.eventBlock,
                        {
                          top: getEventTopOffset(e.event_time, startHour),
                          height: EVENT_HEIGHT,
                          backgroundColor: color.bg,
                          borderRightColor: color.border,
                        },
                      ]}
                    >
                      <Text style={[styles.eventText, { color: color.text }]} numberOfLines={1}>
                        {e.student_name || e.title}
                      </Text>
                      <Text style={[styles.eventTime, { color: color.text }]} numberOfLines={1}>
                        {formatTime12h(e.event_time)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.lg + 25,
    paddingVertical: spacing.md + 25,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },

  weekStrip: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  dayColHead: { flex: 1, alignItems: 'center' },
  dowText: { fontSize: 10, color: '#999' },
  dayNumCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 3,
  },
  dayNumCircleToday: { backgroundColor: colors.pink },
  dayNumText: { fontSize: 12, fontWeight: '700', color: colors.textDark },
  dayNumTextToday: { color: '#fff' },

  grid: { flexDirection: 'row-reverse' },
  timeCol: { width: 40 },
  timeLabel: { fontSize: 9, color: '#bbb', marginTop: 5, textAlign: 'left' },

  dayCol: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#f5f5f5',
    position: 'relative',
  },
  hourLine: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },

  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRightWidth: 3,
    overflow: 'hidden',
  },
  eventText: { fontSize: 9, fontWeight: '800' },
  eventTime: { fontSize: 8, fontWeight: '600', marginTop: 1 },
});