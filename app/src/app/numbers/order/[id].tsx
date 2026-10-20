import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useConfirm } from '@/components/ConfirmSheet';
import { Screen } from '@/components/Screen';
import { ErrorText } from '@/components/fields';
import { Card, EmptyState, InfoRow, SmallButton, StatusPill } from '@/components/kit';
import { cancelNumber, checkNumberOrder } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

export default function NumberOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();
  const { user } = useAuth();
  const db = useDb();
  const [error, setError] = useState<string | null>(null);
  const order = db.numberOrders.find((item) => item.id === id);

  useEffect(() => {
    if (!order || order.status !== 'waiting') return;
    const timer = setInterval(() => {
      void checkNumberOrder(order.id);
    }, 1500);
    return () => clearInterval(timer);
  }, [order?.id, order?.status]);

  if (!order) {
    return (
      <Screen title="Number order" back>
        <EmptyState icon="alert-circle-outline" title="Order not found" />
      </Screen>
    );
  }

  const cancel = async () => {
    if (!user) return;
    const approved = await confirm({
      title: 'Cancel this order?',
      amountKobo: order.priceKobo,
      rows: [{ label: 'Refund', value: formatNaira(order.priceKobo) }],
      note: 'The full amount goes straight back to your wallet.',
      confirmLabel: 'Cancel order',
    });
    if (!approved) return;
    const result = await cancelNumber(order.id);
    if (!result.ok) setError(result.error);
  };

  return (
    <Screen title="Number order" back>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.service}>{order.serviceName}</Text>
            <Text style={styles.country}>
              {order.countryName} · {formatDate(order.createdAt)}
            </Text>
          </View>
          <StatusPill
            label={
              order.status === 'waiting'
                ? 'Waiting'
                : order.status === 'received'
                  ? 'Received'
                  : 'Cancelled'
            }
            tone={order.status === 'waiting' ? 'warn' : order.status === 'received' ? 'ok' : 'bad'}
          />
        </View>

        <Text style={styles.phone}>{order.phoneNumber}</Text>
        <InfoRow label="Paid" value={formatNaira(order.priceKobo)} />
      </Card>

      {order.status === 'waiting' ? (
        <Card style={styles.statusCard}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.statusTitle}>Waiting for SMS…</Text>
          <Text style={styles.statusCaption}>
            In demo mode the code arrives in about 10 seconds. Keep this screen open.
          </Text>
          <SmallButton label="Cancel and refund" onPress={cancel} />
        </Card>
      ) : null}

      {order.status === 'received' ? (
        <Card style={styles.smsCard}>
          <View style={styles.smsHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.moneyIn} />
            <Text style={styles.smsTitle}>SMS received</Text>
          </View>
          <Text style={styles.code}>{order.code}</Text>
          <Text style={styles.message}>{order.message}</Text>
          <Text style={styles.smsHint}>Paste this code in the {order.serviceName} app.</Text>
        </Card>
      ) : null}

      {order.status === 'cancelled' ? (
        <Card style={styles.statusCard}>
          <Ionicons name="refresh-circle-outline" size={40} color={colors.warning} />
          <Text style={styles.statusTitle}>Order cancelled</Text>
          <Text style={styles.statusCaption}>
            {formatNaira(order.priceKobo)} was refunded to your wallet.
          </Text>
        </Card>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Text style={styles.footer}>
        Numbers are provided by 5sim in production. This demo simulates the SMS so you can test the
        whole flow.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  service: { ...typography.sectionTitle, color: colors.text },
  country: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  phone: { ...typography.balance, fontSize: 24, color: colors.text, marginTop: 8 },
  statusCard: { alignItems: 'center', gap: 10, marginTop: 16, paddingVertical: 24 },
  statusTitle: { ...typography.sectionTitle, color: colors.text },
  statusCaption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  smsCard: { marginTop: 16, gap: 8, alignItems: 'center' },
  smsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smsTitle: { ...typography.body, fontWeight: '600', color: colors.moneyIn },
  code: { ...typography.code, color: colors.text, marginTop: 6 },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  smsHint: { ...typography.caption, color: colors.textSecondary },
  footer: { ...typography.caption, color: colors.disabled, lineHeight: 17, marginTop: 20 },
});
