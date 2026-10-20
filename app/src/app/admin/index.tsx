import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/AdminGate';
import { Card, EntryCard, SectionHeader, Stat } from '@/components/kit';
import type { AbuloUser } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { useDb } from '@/lib/db';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { listUsers } = useAuth();
  const db = useDb();
  const [users, setUsers] = useState<AbuloUser[]>([]);

  useEffect(() => {
    let active = true;
    void listUsers().then((list) => {
      if (active) setUsers(list);
    });
    return () => {
      active = false;
    };
  }, [listUsers]);

  const pendingTasks = db.submissions.filter((submission) => submission.status === 'pending').length;
  const pendingCards = db.giftCards.filter((card) => card.status === 'pending').length;
  const pendingListings = db.listings.filter((listing) => listing.status === 'pending').length;
  const pending = pendingTasks + pendingCards + pendingListings;

  return (
    <AdminShell title="Admin">
      <Card style={styles.stats}>
        <Stat value={String(users.length)} label="Users" />
        <Stat value={String(db.numberOrders.length)} label="Numbers sold" />
        <Stat value={String(pending)} label="Pending" tone={pending ? 'warn' : 'muted'} />
      </Card>

      <SectionHeader title="Manage" />
      <View style={styles.entries}>
        <EntryCard
          icon="ribbon-outline"
          title="Tasks"
          subtitle="Post tasks and close them"
          onPress={() => router.push('/admin/tasks')}
        />
        <EntryCard
          icon="checkmark-done-outline"
          title="Approvals"
          subtitle="Task proof, gift cards, listings"
          badge={pending ? String(pending) : undefined}
          onPress={() => router.push('/admin/approvals')}
        />
        <EntryCard
          icon="receipt-outline"
          title="Orders"
          subtitle="Numbers and gift card orders"
          onPress={() => router.push('/admin/orders')}
        />
        <EntryCard
          icon="settings-outline"
          title="Settings"
          subtitle="Markup and fees"
          onPress={() => router.push('/admin/settings')}
        />
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', paddingVertical: 16, marginTop: 4 },
  entries: { gap: 10 },
});
