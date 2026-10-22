import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LedgerRow } from '@/components/LedgerRow';
import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice } from '@/components/fields';
import { BalanceCard, EmptyState, SectionHeader, TileButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { balanceOf, ledgerFor, loadDb, unreadCount, useDb } from '@/lib/db';
import { colors, typography } from '@/theme';

/** "Good morning" / "Good afternoon" / "Good evening" for the local time. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const [refreshing, setRefreshing] = useState(false);
  const displayName = user ? user.name.split(' ')[0] : 'Guest';
  const balance = user ? balanceOf(db, user.id) : 0;
  const recent = user ? ledgerFor(db, user.id).slice(0, 3) : [];
  const unread = unreadCount(db);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadDb();
    setRefreshing(false);
  }, []);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={12}
          style={styles.bell}
          accessibilityRole="button"
          accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unread > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      {db.loadError ? (
        <ErrorText>Could not load your wallet. Pull down to try again.</ErrorText>
      ) : null}

      {db.settings.demoMode ? (
        <FormNotice>
          Demo mode is on. Numbers, gift-card checks and payouts are simulated until the providers
          are connected.
        </FormNotice>
      ) : null}

      <BalanceCard
        balanceKobo={balance}
        loading={db.loading && db.balanceKobo === null}
        onDeposit={() => router.push('/wallet/deposit')}
        onWithdraw={() => router.push('/wallet/withdraw')}
      />

      <View style={styles.tiles}>
        <View style={styles.tileRow}>
          <TileButton
            icon="phone-portrait-outline"
            label="Buy number"
            onPress={() => router.push('/numbers')}
          />
          <TileButton
            icon="person-outline"
            label="Buy account"
            onPress={() => router.push('/market')}
          />
        </View>
        <View style={styles.tileRow}>
          <TileButton
            icon="gift-outline"
            label="Sell gift card"
            onPress={() => router.push('/earn?tab=giftcards')}
          />
          <TileButton
            icon="cash-outline"
            label="Do tasks"
            onPress={() => router.push('/earn?tab=tasks')}
          />
        </View>
      </View>

      <SectionHeader title="Recent activity" action="See all" onAction={() => router.push('/wallet/history')} />
      {recent.length ? (
        <View style={styles.rows}>
          {recent.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : db.loading ? (
        <Text style={styles.loading}>Loading your activity…</Text>
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="No activity yet"
          actionLabel="Deposit"
          actionVariant="accent"
          onAction={() => router.push('/wallet/deposit')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { ...typography.caption, color: colors.textSecondary },
  name: { ...typography.sectionTitle, color: colors.text, marginTop: 2 },
  bell: { padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  tiles: { gap: 12, marginTop: 12 },
  loading: { ...typography.caption, color: colors.textSecondary, paddingVertical: 12 },
  tileRow: { flexDirection: 'row', gap: 12 },
  rows: { gap: 10 },
});
