import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/AdminGate';
import { EmptyState, Segmented, StatusPill } from '@/components/kit';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, radius, typography } from '@/theme';

type Segment = 'numbers' | 'giftcards';

export default function AdminOrdersScreen() {
  const db = useDb();
  const [segment, setSegment] = useState<Segment>('numbers');

  const numberOrders = [...db.numberOrders].sort((a, b) => b.createdAt - a.createdAt);
  const giftCards = [...db.giftCards].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AdminShell title="Orders">
      <Segmented<Segment>
        options={[
          { value: 'numbers', label: `Numbers (${numberOrders.length})` },
          { value: 'giftcards', label: `Gift cards (${giftCards.length})` },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'numbers' ? (
        <View style={styles.section}>
          {numberOrders.length ? (
            numberOrders.map((order) => (
              <View key={order.id} style={styles.row}>
                <View style={styles.text}>
                  <Text style={styles.title}>
                    {order.serviceName} · {order.countryName}
                  </Text>
                  <Text style={styles.sub}>
                    {order.userName} · {order.phoneNumber}
                  </Text>
                  <Text style={styles.sub}>{formatDate(order.createdAt)}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatNaira(order.priceKobo)}</Text>
                  <StatusPill
                    label={
                      order.status === 'waiting'
                        ? 'Waiting'
                        : order.status === 'received'
                          ? 'Received'
                          : 'Cancelled'
                    }
                    tone={
                      order.status === 'waiting'
                        ? 'warn'
                        : order.status === 'received'
                          ? 'ok'
                          : 'bad'
                    }
                  />
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="phone-portrait-outline" title="No number orders yet" />
          )}
        </View>
      ) : null}

      {segment === 'giftcards' ? (
        <View style={styles.section}>
          {giftCards.length ? (
            giftCards.map((card) => (
              <View key={card.id} style={styles.row}>
                <View style={styles.text}>
                  <Text style={styles.title}>
                    {card.brandName} · ${card.faceValueUsd}
                  </Text>
                  <Text style={styles.sub}>{card.userName}</Text>
                  <Text style={styles.sub}>{formatDate(card.createdAt)}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatNaira(card.payoutKobo)}</Text>
                  <StatusPill
                    label={
                      card.status === 'approved'
                        ? 'Paid'
                        : card.status === 'pending'
                          ? 'Checking'
                          : 'Rejected'
                    }
                    tone={
                      card.status === 'approved'
                        ? 'ok'
                        : card.status === 'pending'
                          ? 'warn'
                          : 'bad'
                    }
                  />
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="gift-outline" title="No gift cards yet" />
          )}
        </View>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
  },
  text: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  right: { alignItems: 'flex-end', gap: 5 },
  amount: { ...typography.body, fontWeight: '600', color: colors.text },
});
