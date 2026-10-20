import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, StatusPill } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

export default function NumberOrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const orders = user ? db.numberOrders.filter((order) => order.userId === user.id) : [];

  return (
    <Screen title="My numbers" back>
      {orders.length ? (
        <View style={styles.list}>
          {orders.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push({ pathname: '/numbers/order/[id]', params: { id: order.id } })}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
              <View style={styles.text}>
                <Text style={styles.title}>
                  {order.serviceName} · {order.countryName}
                </Text>
                <Text style={styles.sub}>
                  {order.phoneNumber} · {formatDate(order.createdAt)}
                </Text>
                <Text style={styles.sub}>{formatNaira(order.priceKobo)}</Text>
              </View>
              <StatusPill
                label={
                  order.status === 'waiting'
                    ? 'Waiting'
                    : order.status === 'received'
                      ? 'Received'
                      : 'Cancelled'
                }
                tone={
                  order.status === 'waiting' ? 'warn' : order.status === 'received' ? 'ok' : 'bad'
                }
              />
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState icon="phone-portrait-outline" title="No numbers yet" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  text: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
});
