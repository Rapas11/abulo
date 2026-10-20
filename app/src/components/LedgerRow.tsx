import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { LedgerEntry } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

import type { IconName } from './kit';

const ICONS: Record<LedgerEntry['kind'], IconName> = {
  deposit: 'arrow-down-circle-outline',
  withdrawal: 'arrow-up-circle-outline',
  number: 'phone-portrait-outline',
  number_refund: 'refresh-circle-outline',
  task: 'ribbon-outline',
  giftcard: 'gift-outline',
  account_sale: 'cash-outline',
  account_buy: 'person-outline',
  adjustment: 'ellipsis-horizontal-circle-outline',
};

export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const positive = entry.amountKobo >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={ICONS[entry.kind]} size={20} color={colors.text} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {entry.subtitle} · {formatDate(entry.createdAt)}
        </Text>
      </View>
      <Text style={[styles.amount, positive ? styles.in : null]}>
        {positive ? '+' : '−'}
        {formatNaira(Math.abs(entry.amountKobo))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  amount: { fontSize: 14, fontWeight: '600', color: colors.text },
  in: { color: colors.moneyIn },
});
