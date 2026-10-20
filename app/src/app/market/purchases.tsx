import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { platformById } from '@/lib/catalog';
import { useDb } from '@/lib/db';
import { formatNaira } from '@/lib/money';
import { colors, radius, typography } from '@/theme';

export default function PurchasesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const purchases = user
    ? db.listings.filter((listing) => listing.buyerId === user.id)
    : [];

  return (
    <Screen title="My purchases" back>
      {purchases.length ? (
        <View style={styles.list}>
          {purchases.map((listing) => (
            <View key={listing.id} style={styles.card}>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.sub}>
                {platformById(listing.platform).name} · {formatNaira(listing.priceKobo)}
              </Text>
              <Text selectable style={styles.credentials}>
                {listing.credentials}
              </Text>
              <Text style={styles.hint}>Change the password after signing in.</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="bag-handle-outline"
          title="No purchases yet"
          actionLabel="Browse accounts"
          actionVariant="accent"
          onAction={() => router.push('/market')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
  },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  credentials: {
    ...typography.body,
    fontFamily: 'monospace',
    color: colors.text,
    lineHeight: 21,
    marginTop: 4,
  },
  hint: { ...typography.caption, color: colors.textSecondary },
});
