import { useRouter } from 'expo-router';

import { Screen } from '@/components/Screen';
import { BalanceCard, EmptyState, EntryCard, SectionHeader } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen title="Wallet">
      {/* TODO(Sprint 2): live balance, deposit via Paystack, history. TODO(Sprint 3): withdrawals */}
      <BalanceCard balanceKobo={0} />
      <SectionHeader title="History" action="See all" />
      <EmptyState
        icon="time-outline"
        title="No transactions yet"
        actionLabel="Deposit"
        actionVariant="accent"
      />
      <SectionHeader title="Account" />
      <EntryCard
        icon="person-circle-outline"
        title="Profile & security"
        subtitle={user?.email ?? 'Name, PIN, sign out'}
        onPress={() => router.push('/profile')}
      />
    </Screen>
  );
}
