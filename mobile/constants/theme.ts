export const colors = {
  background: '#f8fafc',
  foreground: '#0f172a',
  card: '#ffffff',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  primary: '#2861f5',
  accent: '#2861f5',
  border: '#e2e8f0',
  success: '#10b981',
  destructive: '#e11d48',
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
  20: 80,
  24: 96,
  30: 120,
} as const;

export const components = {
  tabBar: {
    height: spacing[20],
    iconSize: spacing[7],
    labelTopMargin: spacing[2],
    activeColor: colors.primary,
    inactiveColor: '#64748b',
  },
} as const;
