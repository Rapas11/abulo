import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { BalanceCard, EmptyState, SectionHeader, TileButton } from '@/components/kit';
import { colors, typography } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Good evening</Text>
          {/* TODO(Sprint 1): real profile name after auth lands */}
          <Text style={styles.name}>Guest</Text>
        </View>
        <View>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles.bellDot} />
        </View>
      </View>

      {/* TODO(Sprint 2): live balance from the wallet ledger */}
      <BalanceCard balanceKobo={0} />

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

      <SectionHeader title="Recent activity" action="See all" />
      {/* TODO(Sprint 2): last 5 ledger lines */}
      <EmptyState
        icon="receipt-outline"
        title="No activity yet"
        actionLabel="Deposit"
        actionVariant="accent"
      />
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
});
