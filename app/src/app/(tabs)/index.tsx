import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LedgerRow } from '@/components/LedgerRow';
import { Screen } from '@/components/Screen';
import { BalanceCard, EmptyState, SectionHeader, TileButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { balanceOf, ledgerFor, useDb } from '@/lib/db';
import { colors, typography } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const displayName = user ? user.name.split(' ')[0] : 'Guest';
  const balance = user ? balanceOf(db, user.id) : 0;
  const recent = user ? ledgerFor(db, user.id).slice(0, 3) : [];

  return (
    <Screen>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Good evening</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <View>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles.bellDot} />
        </View>
      </View>

      <BalanceCard
        balanceKobo={balance}
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
            label="Redeem gift card"
            onPress={() => router.push('/earn')}
          />
          <TileButton
            icon="cash-outline"
            label="Do tasks"
            onPress={() => router.push('/earn')}
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
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  tiles: { gap: 12, marginTop: 12 },
  tileRow: { flexDirection: 'row', gap: 12 },
  rows: { gap: 10 },
});
