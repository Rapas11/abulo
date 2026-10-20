import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LedgerRow } from '@/components/LedgerRow';
import { Screen } from '@/components/Screen';
import { BalanceCard, EmptyState, EntryCard, SectionHeader } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { balanceOf, ledgerFor, useDb } from '@/lib/db';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const balance = user ? balanceOf(db, user.id) : 0;
  const recent = user ? ledgerFor(db, user.id).slice(0, 5) : [];

  return (
    <Screen title="Wallet">
      <BalanceCard
        balanceKobo={balance}
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
});
