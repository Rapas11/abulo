import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useConfirm } from '@/components/ConfirmSheet';
import { Screen } from '@/components/Screen';
import { ErrorText } from '@/components/fields';
import { Card, EmptyState, InfoRow, MainButton, StatusPill } from '@/components/kit';
import { buyListing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { platformById } from '@/lib/catalog';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const confirm = useConfirm();
  const { user } = useAuth();
  const db = useDb();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const listing = db.listings.find((item) => item.id === id);

  if (!listing) {
    return (
      <Screen title="Account" back>
        <EmptyState icon="alert-circle-outline" title="Listing not found" />
      </Screen>
    );
  }

  const platform = platformById(listing.platform);
  const isMine = listing.sellerId === user?.id;
  const bought = listing.status === 'sold' && listing.buyerId === user?.id;

  const buy = async () => {
    if (!user || busy) return;
    setError(null);
    const approved = await confirm({
      title: 'Buy this account',
      amountKobo: listing.priceKobo,
      rows: [
        { label: 'Account', value: listing.title },
        { label: 'Seller', value: listing.sellerName },
        { label: 'Delivery', value: 'Credentials shown instantly' },
      ],
      note: `A ${db.settings.accountFeePct}% fee goes to Abulo; the seller receives the rest.`,
      confirmLabel: 'Pay and get details',
      requirePin: true,
    });
    if (!approved) return;
    setBusy(true);
    const result = await buyListing(listing.id);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <Screen title="Account" back>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name={platform.icon} size={32} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{formatNaira(listing.priceKobo)}</Text>
        <StatusPill
          label={
            bought
              ? 'Purchased'
              : listing.status === 'active'
                ? 'Available'
                : listing.status === 'sold'
                  ? 'Sold'
                  : listing.status === 'pending'
                    ? 'In review'
                    : 'Rejected'
          }
          tone={bought ? 'ok' : listing.status === 'active' ? 'ok' : 'muted'}
        />
      </View>

      <Card style={styles.card}>
        <Text style={styles.description}>{listing.description}</Text>
        <InfoRow label="Platform" value={platform.name} />
        <InfoRow label="Seller" value={listing.sellerName} />
        <InfoRow label="Listed" value={formatDate(listing.createdAt)} />
        {listing.soldAt ? <InfoRow label="Sold" value={formatDate(listing.soldAt)} /> : null}
      </Card>

      {bought && listing.credentials ? (
        <Card style={styles.credentials}>
          <View style={styles.credentialsHeader}>
            <Ionicons name="key-outline" size={20} color={colors.moneyIn} />
            <Text style={styles.credentialsTitle}>Login details</Text>
          </View>
          <Text selectable style={styles.credentialsText}>
            {listing.credentials}
          </Text>
          <Text style={styles.credentialsHint}>
            Change the password immediately after signing in.
          </Text>
        </Card>
      ) : null}

      {isMine ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>
            {db.settings.demoMode
              ? 'This is your listing. It goes live after review (auto-approved in demo).'
              : 'This is your listing. It goes live once it is approved.'}
          </Text>
        </Card>
      ) : null}

      {!bought && listing.status === 'sold' ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>This account has already been sold.</Text>
        </Card>
      ) : null}

      {error ? <ErrorText>{error}</ErrorText> : null}

      {listing.status === 'active' && !isMine ? (
        <View style={styles.actions}>
          <MainButton label={`Buy for ${formatNaira(listing.priceKobo)}`} onPress={buy} loading={busy} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center', marginTop: 4 },
  price: { ...typography.balance, color: colors.text },
  card: { gap: 4, marginTop: 12 },
  description: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: 8 },
  credentials: { marginTop: 14, gap: 10 },
  credentialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  credentialsTitle: { ...typography.body, fontWeight: '600', color: colors.moneyIn },
  credentialsText: {
    ...typography.body,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 21,
  },
  credentialsHint: { ...typography.caption, color: colors.textSecondary },
  noteCard: { marginTop: 14 },
  noteText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  actions: { marginTop: 20 },
});
