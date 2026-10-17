import './global.css';

import { Platform, TextStyle } from 'react-native';

/**
 * Abulo design tokens — the single source of truth.
 * Values come from the spec tables (colors, type, sizes, corners).
 */

export const colors = {
  bg: '#121212',
  surface: '#1C1C1E',
  raised: '#2C2C2E',
  pressed: '#3A3A3C',
  accent: '#FF7A00',
  accentPressed: '#E66E00',
  onAccent: '#121212',
  text: '#F2F2F7',
  textSecondary: '#8E8E93',
  disabled: '#48484A',
  moneyIn: '#22C55E',
  warning: '#FFB020',
  danger: '#FF453A',
} as const;

export const fonts = {
  sans:
    Platform.select({ ios: 'System', android: 'sans-serif', web: 'inherit', default: 'normal' }) ??
    'normal',
  mono:
    Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      web: 'ui-monospace, Menlo, Consolas, monospace',
      default: 'monospace',
    }) ?? 'monospace',
};

/** Identity helper so every entry is typed as TextStyle. */
const t = (style: TextStyle): TextStyle => style;

export const typography = {
  screenTitle: t({ fontSize: 22, fontWeight: '600' }),
  sectionTitle: t({ fontSize: 17, fontWeight: '600' }),
  body: t({ fontSize: 15, fontWeight: '400' }),
  caption: t({ fontSize: 12, fontWeight: '400' }),
  button: t({ fontSize: 15, fontWeight: '600' }),
  balance: t({ fontSize: 34, fontWeight: '600', letterSpacing: -0.6 }),
  code: t({ fontSize: 32, fontWeight: '600', letterSpacing: 4, fontFamily: fonts.mono }),
  tabLabel: t({ fontSize: 11, fontWeight: '500' }),
};

export const layout = {
  screenPadding: 16,
  cardGap: 12,
  cardPadding: 14,
  headerHeight: 56,
} as const;

export const radius = {
  card: 16,
  button: 14,
  smallButton: 18,
  input: 12,
  chip: 17,
  badge: 11,
  sheet: 24,
  search: 24,
} as const;

export const size = {
  mainButton: 52,
  smallButton: 36,
  input: 52,
  search: 48,
  chip: 34,
  badge: 22,
  tabBar: 64,
  tabIcon: 24,
  tileIconCircle: 44,
  emptyIcon: 48,
  toast: 44,
} as const;
