import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, EntryCard, SectionHeader, Stat } from '@/components/kit';

export default function EarnScreen() {
  return (
    <Screen title="Earn">
      {/* TODO(Sprint 5): tasks list + proof upload. TODO(Sprint 6): gift card submit flow */}
      <View style={styles.entries}>
        <EntryCard
          icon="cash-outline"
          title="Tasks"
          subtitle="Small jobs, paid per task"
          badge="Soon"
        />
        <EntryCard
          icon="gift-outline"
          title="Gift cards"
          subtitle="Redeem at top rates, paid in minutes"
          badge="Soon"
        />
      </View>

      <SectionHeader title="My earnings" />
      <Card style={styles.stats}>
        <Stat value="₦0" label="Pending" tone="warn" />
        <Stat value="₦0" label="Approved" tone="in" />
        <Stat value="₦0" label="Rejected" tone="muted" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  entries: { gap: 12 },
  stats: { flexDirection: 'row', paddingVertical: 16 },
});
