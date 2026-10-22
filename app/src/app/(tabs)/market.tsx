import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { EmptyState, MainButton, SectionHeader, Segmented, StatusPill } from '@/components/kit';
import { createListing, pollListing } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PLATFORMS, platformById } from '@/lib/catalog';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

type Segment = 'buy' | 'sell' | 'mine';

function listingPill(status: 'pending' | 'active' | 'sold' | 'rejected') {
  if (status === 'active') return { label: 'Live', tone: 'ok' as const };
  if (status === 'sold') return { label: 'Sold', tone: 'muted' as const };
  if (status === 'pending') return { label: 'In review', tone: 'warn' as const };
  return { label: 'Rejected', tone: 'bad' as const };
}

export default function MarketScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const [segment, setSegment] = useState<Segment>('buy');
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);

  const activeListings = db.listings
    .filter((listing) => listing.status === 'active')
    .sort((a, b) => b.createdAt - a.createdAt);
  const myListings = user
    ? db.listings
        .filter((listing) => listing.sellerId === user.id)
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  useEffect(() => {
    if (!myListings.some((listing) => listing.status === 'pending')) return;
    const timer = setInterval(() => {
      myListings
        .filter((listing) => listing.status === 'pending')
        .forEach((listing) => {
          void pollListing(listing.id);
        });
    }, 2000);
    return () => clearInterval(timer);
  }, [db.listings, user?.id]);

  const submitListing = async () => {
    if (!user || busy) return;
    setError(null);
    const priceKobo = Math.round(Number(price || '0') * 100);
    if (!price.trim() || priceKobo < 100000) {
      setError('Minimum price is ₦1,000.');
      return;
    }
    setBusy(true);
    const result = await createListing({
      platform,
      title,
      description,
      priceKobo,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle('');
    setDescription('');
    setPrice('');
    setPosted(true);
    setSegment('mine');
  };

  return (
    <Screen title="Market">
      <Segmented<Segment>
        options={[
          { value: 'buy', label: 'Buy' },
          { value: 'sell', label: 'Sell' },
          { value: 'mine', label: 'My listings' },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'buy' ? (
        <View style={styles.section}>
          <SectionHeader
            title="Accounts for sale"
            action="Purchases"
            onAction={() => router.push('/market/purchases')}
          />
          {activeListings.length ? (
            <View style={styles.list}>
              {activeListings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() =>
                    router.push({ pathname: '/market/listing/[id]', params: { id: listing.id } })
                  }
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={platformById(listing.platform).icon} size={20} color={colors.text} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={styles.sub}>
                      {platformById(listing.platform).name} · {listing.sellerName}
                    </Text>
                  </View>
                  <Text style={styles.price}>{formatNaira(listing.priceKobo)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState icon="storefront-outline" title="No accounts for sale yet" />
          )}
        </View>
      ) : null}

      {segment === 'sell' ? (
        <View style={styles.section}>
          {db.settings.demoMode ? (
            <FormNotice>Demo mode — listings go live automatically after about 25 seconds.</FormNotice>
          ) : (
            <FormNotice>Listings are reviewed by our team before they go live.</FormNotice>
          )}
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Platform</Text>
            <View style={styles.platforms}>
              {PLATFORMS.map((item) => {
                const active = platform === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setPlatform(item.id)}
                    style={[styles.platformChip, active && styles.platformChipActive]}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={active ? colors.onAccent : colors.text}
                    />
                    <Text style={[styles.platformLabel, active && styles.platformLabelActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Instagram — 8.5k followers"
            />
            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Age, followers, login details included…"
              multiline
            />
            <TextField
              label="Price (₦)"
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              keyboardType="number-pad"
            />
            {error ? <ErrorText>{error}</ErrorText> : null}
            <MainButton label="List account" onPress={submitListing} loading={busy} />
            <Text style={styles.hint}>
              A {db.settings.accountFeePct}% fee is taken from the sale when your account is bought.
            </Text>
          </View>
        </View>
      ) : null}

      {segment === 'mine' ? (
        <View style={styles.section}>
          {posted ? (
            <FormNotice>
              {db.settings.demoMode
                ? 'Listing posted. It is in review now — auto-approved in demo.'
                : 'Listing posted. It goes live once it is approved.'}
            </FormNotice>
          ) : null}
          {myListings.length ? (
            <View style={styles.list}>
              {myListings.map((listing) => {
                const pill = listingPill(listing.status);
                return (
                  <Pressable
                    key={listing.id}
                    onPress={() =>
                      router.push({ pathname: '/market/listing/[id]', params: { id: listing.id } })
                    }
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={platformById(listing.platform).icon}
                        size={20}
                        color={colors.text}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.title} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={styles.sub}>
                        {formatNaira(listing.priceKobo)} · {formatDate(listing.createdAt)}
                      </Text>
                    </View>
                    <StatusPill label={pill.label} tone={pill.tone} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="pricetag-outline"
              title="You have not listed anything"
              actionLabel="Sell an account"
              actionVariant="accent"
              onAction={() => setSegment('sell')}
            />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 12 },
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
  rowText: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  price: { ...typography.body, fontWeight: '600', color: colors.text },
  form: { gap: 12, marginTop: 16 },
  fieldLabel: { ...typography.caption, color: colors.textSecondary },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.raised,
  },
  platformChipActive: { backgroundColor: colors.accent },
  platformLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  platformLabelActive: { color: colors.onAccent, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
