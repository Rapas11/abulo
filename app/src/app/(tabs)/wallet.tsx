import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LedgerRow } from '@/components/LedgerRow';
import { Screen } from '@/components/Screen';
import { ErrorText } from '@/components/fields';
import { BalanceCard, EmptyState, EntryCard, SectionHeader } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { balanceOf, ledgerFor, loadDb, useDb } from '@/lib/db';
import { colors, typography } from '@/theme';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const [refreshing, setRefreshing] = useState(false);
  const balance = user ? balanceOf(db, user.id) : 0;
  const recent = user ? ledgerFor(db, user.id).slice(0, 5) : [];

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadDb();
    setRefreshing(false);
  }, []);

  return (
    <Screen title="Wallet" onRefresh={refresh} refreshing={refreshing}>
      {db.loadError ? (
        <ErrorText>Could not load your wallet. Pull down to try again.</ErrorText>
      ) : null}

      <BalanceCard
        balanceKobo={balance}
        loading={db.loading && db.balanceKobo === null}
        onDeposit={() => router.push('/wallet/deposit')}
        onWithdraw={() => router.push('/wallet/withdraw')}
      />

      <SectionHeader title="History" action="See all" onAction={() => router.push('/wallet/history')} />
      {recent.length ? (
        <View style={styles.rows}>
          {recent.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : db.loading ? (
        <Text style={styles.loading}>Loading your transactions…</Text>
      ) : (
        <EmptyState
          icon="time-outline"
          title="No transactions yet"
          actionLabel="Deposit"
          actionVariant="accent"
          onAction={() => router.push('/wallet/deposit')}
        />
      )}

      <SectionHeader title="Account" />
      <EntryCard
        icon="person-circle-outline"
        title="Profile & security"
        subtitle={user?.email ?? 'Name, PIN, sign out'}
        onPress={() => router.push('/profile')}
      />
      <View style={styles.spacer} />
      <EntryCard
        icon="bag-handle-outline"
        title="My purchases"
        subtitle="Accounts you bought"
        onPress={() => router.push('/market/purchases')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 10 },
  spacer: { height: 10 },
  loading: { ...typography.caption, color: colors.textSecondary, paddingVertical: 12 },
});
