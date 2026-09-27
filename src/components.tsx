// components.tsx - عناصر واجهة مشتركة تستخدم في كل الشاشات
import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from './theme';

interface TopBarProps {
  title: string;
  subtitle?: string;
  icon?: string;
}
export function TopBar({ title, subtitle, icon }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topBarTitle}>{icon ? `${icon}  ` : ''}{title}</Text>
      {subtitle ? <Text style={styles.topBarSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
}
export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

interface BadgeProps {
  text: string;
  type?: 'success' | 'warning' | 'danger';
}
export function Badge({ text, type = 'success' }: BadgeProps) {
  const bg = type === 'success' ? colors.successBg : type === 'warning' ? colors.warningBg : colors.dangerBg;
  const fg = type === 'success' ? colors.success : type === 'warning' ? colors.warning : colors.danger;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 11 }}>{text}</Text>
    </View>
  );
}

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  outline?: boolean;
  disabled?: boolean;
}
export function PrimaryButton({ title, onPress, outline = false, disabled = false }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        outline ? styles.btnOutline : styles.btnFilled,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={outline ? styles.btnOutlineText : styles.btnFilledText}>{title}</Text>
    </TouchableOpacity>
  );
}

interface RowProps {
  left: string;
  right?: ReactNode;
  subtitle?: string;
}
export function Row({ left, right, subtitle }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{left}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

interface LoadingViewProps {
  message?: string;
}
export function LoadingView({ message = 'جاري التحميل...' }: LoadingViewProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.pinkDark} size="large" />
      <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>{message}</Text>
    </View>
  );
}

interface EmptyStateProps {
  message: string;
}
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.textMuted }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 6,
  },
  topBarTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  topBarSubtitle: { color: '#fff', opacity: 0.9, marginTop: 2, textAlign: 'right' },

  statCard: {
    flex: 1,
    backgroundColor: colors.pinkLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-end',
  },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  statValue: { color: colors.pinkDark, fontWeight: '800', fontSize: 20, marginTop: 4 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  btn: {
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnFilled: { backgroundColor: colors.pink },
  btnFilledText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.pink, backgroundColor: '#fff' },
  btnOutlineText: { color: colors.pinkDark, fontWeight: '700' },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontWeight: '700', color: colors.textDark, fontSize: 13, textAlign: 'right' },
  rowSubtitle: { color: colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
