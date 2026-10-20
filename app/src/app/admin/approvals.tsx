import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/AdminGate';
import { Card, EmptyState, SectionHeader, Segmented, SmallButton } from '@/components/kit';
import { reviewGiftCard, reviewListing, reviewSubmission } from '@/lib/api';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

type Segment = 'tasks' | 'giftcards' | 'listings';

export default function AdminApprovalsScreen() {
  const db = useDb();
  const [segment, setSegment] = useState<Segment>('tasks');

  const pendingSubmissions = db.submissions
    .filter((submission) => submission.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);
  const pendingCards = db.giftCards
    .filter((card) => card.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);
  const pendingListings = db.listings
    .filter((listing) => listing.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AdminShell title="Approvals">
      <Segmented<Segment>
        options={[
          { value: 'tasks', label: `Tasks (${pendingSubmissions.length})` },
          { value: 'giftcards', label: `Cards (${pendingCards.length})` },
          { value: 'listings', label: `Accounts (${pendingListings.length})` },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === 'tasks' ? (
        <View style={styles.section}>
          {pendingSubmissions.length ? (
            pendingSubmissions.map((submission) => (
              <Card key={submission.id} style={styles.review}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>{submission.taskTitle}</Text>
                  <Text style={styles.reward}>{formatNaira(submission.rewardKobo)}</Text>
                </View>
                <Text style={styles.reviewSub}>
                  {submission.userName} · {formatDate(submission.createdAt)}
                </Text>
                <Text style={styles.proof}>{submission.note}</Text>
                <View style={styles.buttons}>
                  <SmallButton
                    label="Approve"
                    variant="accent"
                    onPress={() => {
                      void reviewSubmission(submission.id, true);
                    }}
                  />
                  <SmallButton
                    label="Reject"
                    onPress={() => {
                      void reviewSubmission(submission.id, false);
                    }}
                  />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon="checkmark-done-outline" title="No task proof waiting" />
          )}
        </View>
      ) : null}

      {segment === 'giftcards' ? (
        <View style={styles.section}>
          {pendingCards.length ? (
            pendingCards.map((card) => (
              <Card key={card.id} style={styles.review}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>
                    {card.brandName} · ${card.faceValueUsd}
                  </Text>
                  <Text style={styles.reward}>{formatNaira(card.payoutKobo)}</Text>
                </View>
                <Text style={styles.reviewSub}>
                  {card.userName} · {formatDate(card.createdAt)}
                </Text>
                <Text style={styles.code}>
                  Code: {card.code}
                  {card.pin ? ` · PIN: ${card.pin}` : ''}
                </Text>
                <View style={styles.buttons}>
                  <SmallButton
                    label="Approve"
                    variant="accent"
                    onPress={() => {
                      void reviewGiftCard(card.id, true);
                    }}
                  />
                  <SmallButton
                    label="Reject"
                    onPress={() => {
                      void reviewGiftCard(card.id, false);
                    }}
                  />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon="gift-outline" title="No gift cards waiting" />
          )}
        </View>
      ) : null}

      {segment === 'listings' ? (
        <View style={styles.section}>
          {pendingListings.length ? (
            pendingListings.map((listing) => (
              <Card key={listing.id} style={styles.review}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>{listing.title}</Text>
                  <Text style={styles.reward}>{formatNaira(listing.priceKobo)}</Text>
                </View>
                <Text style={styles.reviewSub}>
                  {listing.sellerName} · {formatDate(listing.createdAt)}
                </Text>
                <Text style={styles.proof}>{listing.description}</Text>
                <View style={styles.buttons}>
                  <SmallButton
                    label="Approve"
                    variant="accent"
                    onPress={() => {
                      void reviewListing(listing.id, true);
                    }}
                  />
                  <SmallButton
                    label="Reject"
                    onPress={() => {
                      void reviewListing(listing.id, false);
                    }}
                  />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon="storefront-outline" title="No listings waiting" />
          )}
        </View>
      ) : null}

      <SectionHeader title="History" />
      <Text style={styles.historyHint}>
        Reviewed items leave this queue. Full orders are under Orders.
      </Text>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 14 },
  review: { gap: 6 },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  reviewTitle: { ...typography.body, fontWeight: '600', color: colors.text, flex: 1 },
  reward: { ...typography.body, fontWeight: '600', color: colors.moneyIn },
  reviewSub: { ...typography.caption, color: colors.textSecondary },
  proof: { ...typography.caption, color: colors.text, lineHeight: 18 },
  code: { ...typography.caption, color: colors.textSecondary, fontFamily: 'monospace' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  historyHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
});
