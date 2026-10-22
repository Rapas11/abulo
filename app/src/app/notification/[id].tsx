import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CopyButton } from '@/components/CopyButton';
import { Screen } from '@/components/Screen';
import { Card, EmptyState, MainButton } from '@/components/kit';
import { useDb, type NotificationKind } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

const ICONS: Record<NotificationKind, React.ComponentProps<typeof Ionicons>['name']> = {
  number: 'phone-portrait-outline',
  task: 'checkmark-done-outline',
  giftcard: 'gift-outline',
  account: 'people-outline',
  wallet: 'wallet-outline',
};

const LINK_LABELS: Record<NotificationKind, string> = {
  number: 'Open order',
  task: 'Open task',
  giftcard: 'Open gift card',
  account: 'Open listing',
  wallet: 'Open wallet',
};

/** "WhatsApp · code 550572" → "550572" — shown big with a copy button. */
function codeIn(body: string | null): string | null {
  return body?.match(/\bcode\s+([A-Z0-9]{4,})\b/i)?.[1] ?? null;
}

/**
 * One notification in full: what happened, when, how much, and a way into
 * the screen it refers to. Opening this is also the acknowledgement.
 */
export default function NotificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const item = db.notifications.find((entry) => entry.id === id);

  if (!item) {
    return (
      <Screen title="Notification" back>
        <EmptyState icon="notifications-off-outline" title="Notification not found" />
      </Screen>
    );
  }

  const code = codeIn(item.body);

  return (
    <Screen title="Notification" back>
      <Card style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={ICONS[item.kind] ?? 'notifications-outline'} size={24} color={colors.text} />
        </View>

        <Text style={styles.title}>{item.title}</Text>
        {item.body ? <Text style={styles.body}>{item.body}</Text> : null}

        {item.amountKobo ? (
          <Text
            style={[
              styles.amount,
              { color: item.amountKobo > 0 ? colors.moneyIn : colors.text },
            ]}>
            {item.amountKobo > 0 ? '+' : '−'}
            {formatNaira(Math.abs(item.amountKobo))}
          </Text>
        ) : null}

        <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
      </Card>

      {code ? (
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>Verification code</Text>
          <Text style={styles.code}>{code}</Text>
          <CopyButton value={code} label="Copy code" />
        </Card>
      ) : null}

      {item.link ? (
        <MainButton
          label={LINK_LABELS[item.kind] ?? 'Open'}
          icon="open-outline"
          onPress={() => router.push(item.link as never)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  amount: { fontSize: 28, fontWeight: '700', marginTop: 6 },
  time: { ...typography.caption, color: colors.textSecondary, opacity: 0.8 },
  codeCard: { alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 20 },
  codeLabel: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  code: { ...typography.code, color: colors.text },
});
