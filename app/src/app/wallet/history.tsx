import { StyleSheet, View } from 'react-native';

import { LedgerRow } from '@/components/LedgerRow';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { ledgerFor, useDb } from '@/lib/db';

export default function HistoryScreen() {
  const { user } = useAuth();
  const db = useDb();
  const entries = user ? ledgerFor(db, user.id) : [];

  return (
    <Screen title="History" back>
      {entries.length ? (
        <View style={styles.rows}>
          {entries.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="time-outline"
          title="No transactions yet"
          actionLabel="Deposit"
          actionVariant="accent"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 10 },
});
