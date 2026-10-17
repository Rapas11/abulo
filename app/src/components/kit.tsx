import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { formatNaira } from '@/lib/money';
import { colors, layout, radius, size, typography } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonVariant = 'accent' | 'raised';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SmallButton({
  label,
  variant = 'raised',
  icon,
  onPress,
  style,
  disabled,
}: {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const accent = variant === 'accent';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        accent ? styles.smallButtonAccent : styles.smallButtonRaised,
        pressed && { backgroundColor: accent ? colors.accentPressed : colors.pressed },
        disabled && { opacity: 0.5 },
        style,
      ]}>
      {icon ? (
        <Ionicons name={icon} size={18} color={accent ? colors.onAccent : colors.text} />
      ) : null}
      <Text style={[typography.button, { color: accent ? colors.onAccent : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconCircle({ name }: { name: IconName }) {
  return (
    <View style={styles.iconCircle}>
      <Ionicons name={name} size={26} color={colors.onAccent} />
    </View>
  );
}

export function TileButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.pressed }]}>
      <IconCircle name={icon} />
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  actionLabel,
  actionVariant = 'raised',
  onAction,
}: {
  icon: IconName;
  title: string;
  actionLabel?: string;
  actionVariant?: ButtonVariant;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={size.emptyIcon} color={colors.disabled} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {actionLabel ? (
        <SmallButton label={actionLabel} variant={actionVariant} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function BalanceCard({
  balanceKobo,
  onDeposit,
  onWithdraw,
}: {
  balanceKobo: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}) {
  return (
    <View style={styles.balanceCard}>
      <View>
        <Text style={styles.balanceLabel}>Wallet balance</Text>
        <Text style={styles.balanceAmount}>{formatNaira(balanceKobo)}</Text>
      </View>
      <View style={styles.balanceActions}>
        <SmallButton
          label="Deposit"
          variant="accent"
          icon="arrow-down"
          onPress={onDeposit}
          style={styles.flex1}
        />
        <SmallButton label="Withdraw" icon="arrow-up" onPress={onWithdraw} style={styles.flex1} />
      </View>
    </View>
  );
}

export function EntryCard({
  icon,
  title,
  subtitle,
  badge,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && { backgroundColor: colors.pressed }]}>
      <IconCircle name={icon} />
      <View style={styles.flex1}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entrySub}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={styles.entryBadge}>
          <Text style={styles.entryBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

export function Stat({
  value,
  label,
  tone = 'text',
}: {
  value: string;
  label: string;
  tone?: 'text' | 'in' | 'warn' | 'muted';
}) {
  const color =
    tone === 'in'
      ? colors.moneyIn
      : tone === 'warn'
        ? colors.warning
        : tone === 'muted'
          ? colors.textSecondary
          : colors.text;
  return (
    <View style={styles.stat}>
      <Text style={[typography.sectionTitle, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  link: { ...typography.button, fontSize: 13, color: colors.accent, marginLeft: 'auto' },
  smallButton: {
    height: size.smallButton,
    borderRadius: radius.smallButton,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.raised,
  },
  smallButtonAccent: { backgroundColor: colors.accent },
  smallButtonRaised: { backgroundColor: colors.raised },
  iconCircle: {
    width: size.tileIconCircle,
    height: size.tileIconCircle,
    borderRadius: size.tileIconCircle / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    height: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    justifyContent: 'space-between',
  },
  tileLabel: { ...typography.body, fontWeight: '600', color: colors.text },
  chip: {
    height: size.chip,
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent },
  chipLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  chipLabelSelected: { color: colors.onAccent, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  emptyTitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    height: 120,
    justifyContent: 'space-between',
  },
  balanceLabel: { ...typography.caption, color: colors.textSecondary },
  balanceAmount: { ...typography.balance, color: colors.text, marginTop: 2 },
  balanceActions: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  entryTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  entrySub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  entryBadge: {
    backgroundColor: colors.raised,
    borderRadius: radius.badge,
    height: size.badge,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryBadgeText: { fontSize: 11, color: colors.textSecondary },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
