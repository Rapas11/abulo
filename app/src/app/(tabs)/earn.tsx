import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, SectionHeader, Segmented, StatusPill } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { GIFT_BRANDS } from '@/lib/catalog';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

type Segment = 'tasks' | 'giftcards';

function submissionTone(status: 'pending' | 'approved' | 'rejected') {
  return status === 'approved' ? 'ok' : status === 'pending' ? 'warn' : 'bad';
}

function giftTone(status: 'pending' | 'approved' | 'rejected') {
  return status === 'approved' ? 'ok' : status === 'pending' ? 'warn' : 'bad';
}

export default function EarnScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const [segment, setSegment] = useState<Segment>('tasks');

  const tasks = db.tasks.filter((task) => task.status === 'open');
  const mySubmissions = user
    ? db.submissions.filter((submission) => submission.userId === user.id).slice(0, 5)
    : [];
  const myCards = user ? db.giftCards.filter((card) => card.userId === user.id).slice(0, 5) : [];

  return (
    <Screen title="Earn">
      <Segmented<Segment>
        options={[
          { value: 'tasks', label: 'Tasks' },
          { value: 'giftcards', label: 'Gift cards' },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'tasks' ? (
        <View style={styles.section}>
          <SectionHeader title="Available tasks" />
          {tasks.length ? (
            <View style={styles.list}>
              {tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="ribbon-outline" size={20} color={colors.text} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={styles.sub}>
                      {Math.max(task.slots - task.taken, 0)} slots left
                    </Text>
                  </View>
                  <Text style={styles.reward}>{formatNaira(task.rewardKobo)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState icon="ribbon-outline" title="No tasks right now" />
          )}

          <SectionHeader title="My submissions" />
          {mySubmissions.length ? (
            <View style={styles.list}>
              {mySubmissions.map((submission) => (
                <View key={submission.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {submission.taskTitle}
                    </Text>
                    <Text style={styles.sub}>
                      {formatNaira(submission.rewardKobo)} · {formatDate(submission.createdAt)}
                    </Text>
                  </View>
                  <StatusPill
                    label={
                      submission.status === 'approved'
                        ? 'Paid'
                        : submission.status === 'pending'
                          ? 'Pending'
                          : 'Rejected'
                    }
                    tone={submissionTone(submission.status)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="document-text-outline" title="No submissions yet" />
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader title="Sell a gift card" />
          <View style={styles.grid}>
            {GIFT_BRANDS.map((brand) => (
              <Pressable
                key={brand.id}
                onPress={() =>
                  router.push({ pathname: '/giftcards/[brand]', params: { brand: brand.id } })
                }
                style={({ pressed }) => [styles.brandCard, pressed && { backgroundColor: colors.pressed }]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={brand.icon} size={20} color={colors.text} />
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {brand.name}
                </Text>
                <Text style={styles.sub}>{formatNaira(brand.rateNgn * 100)} / $1</Text>
              </Pressable>
            ))}
          </View>

          <SectionHeader title="My gift cards" />
          {myCards.length ? (
            <View style={styles.list}>
              {myCards.map((card) => (
                <View key={card.id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {card.brandName} · ${card.faceValueUsd}
                    </Text>
                    <Text style={styles.sub}>
                      {formatNaira(card.payoutKobo)} · {formatDate(card.createdAt)}
                    </Text>
                  </View>
                  <StatusPill
                    label={
                      card.status === 'approved'
                        ? 'Paid'
                        : card.status === 'pending'
                          ? 'Checking'
                          : 'Rejected'
                    }
                    tone={giftTone(card.status)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="gift-outline" title="No gift cards submitted" />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 4 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  reward: { ...typography.body, fontWeight: '600', color: colors.moneyIn },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  brandCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: layout.cardPadding,
    gap: 6,
  },
});
