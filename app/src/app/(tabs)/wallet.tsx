import { Screen } from '@/components/Screen';
import { BalanceCard, EmptyState, SectionHeader } from '@/components/kit';

export default function WalletScreen() {
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
    </Screen>
  );
}
