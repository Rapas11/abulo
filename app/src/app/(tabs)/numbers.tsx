import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Chip, EmptyState, SectionHeader, StatusPill } from '@/components/kit';
import { COUNTRIES, SERVICES, numberPriceKobo } from '@/lib/catalog';
import { useAuth } from '@/lib/auth-context';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

export default function NumbersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const [countryCode, setCountryCode] = useState('ng');
  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const orders = user ? db.numberOrders.filter((order) => order.userId === user.id).slice(0, 3) : [];

  return (
    <Screen title="Numbers">
      <Text style={styles.caption}>Buy a virtual number for verification codes.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.countries}>
        {COUNTRIES.map((item) => (
          <Chip
            key={item.code}
            label={`${item.flag} ${item.name}`}
            selected={item.code === countryCode}
            onPress={() => setCountryCode(item.code)}
          />
        ))}
      </ScrollView>

      <View style={styles.list}>
        {SERVICES.map((service) => (
          <Pressable
            key={service.id}
            onPress={() =>
              router.push({
                pathname: '/numbers/service',
                params: { country: country.code, service: service.id },
              })
            }
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={service.icon} size={20} color={colors.text} />
            </View>
            <Text style={styles.rowTitle}>{service.name}</Text>
            <Text style={styles.price}>
              {formatNaira(numberPriceKobo(service, country, db.settings.numbersMarkupPct))}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      <SectionHeader
        title="My orders"
        action="See all"
        onAction={() => router.push('/numbers/orders')}
      />
      {orders.length ? (
        <View style={styles.orders}>
          {orders.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push({ pathname: '/numbers/order/[id]', params: { id: order.id } })}
              style={({ pressed }) => [styles.orderRow, pressed && { backgroundColor: colors.pressed }]}>
              <View style={styles.orderText}>
                <Text style={styles.rowTitle}>
                  {order.serviceName} · {order.countryName}
                </Text>
                <Text style={styles.orderSub}>{formatDate(order.createdAt)}</Text>
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
  caption: { ...typography.body, color: colors.textSecondary, marginBottom: 14 },
  countries: { gap: 8, paddingBottom: 16 },
  list: { gap: 10 },
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
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  price: { ...typography.body, fontWeight: '600', color: colors.textSecondary },
  orders: { gap: 10 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  orderText: { flex: 1, gap: 2 },
  orderSub: { ...typography.caption, color: colors.textSecondary },
});
