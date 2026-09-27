// theme.ts - نفس ألوان الباستيل اللي استخدمناها في تصميم الـ HTML
export const colors = {
  pink: '#f4a6c1',
  pinkDark: '#c9789e',
  pinkLight: '#fdf1f5',
  pinkSoft: '#f9d5e3',
  white: '#ffffff',
  textDark: '#333333',
  textMuted: '#999999',
  border: '#f0f0f0',
  success: '#2e7d32',
  successBg: '#e8f5e9',
  warning: '#e65100',
  warningBg: '#fff3e0',
  danger: '#c62828',
  dangerBg: '#ffebee',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
