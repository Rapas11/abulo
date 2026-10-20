import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, TextField } from '@/components/fields';
import { Card, EmptyState, InfoRow, MainButton, StatusPill } from '@/components/kit';
import { submitTask } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const db = useDb();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const task = db.tasks.find((item) => item.id === id);
  const mySubmission = user
    ? db.submissions
        .filter((submission) => submission.taskId === id && submission.userId === user.id)
        .sort((a, b) => b.createdAt - a.createdAt)[0]
    : undefined;
  const blocked = mySubmission?.status === 'pending' || mySubmission?.status === 'approved';

  if (!task) {
    return (
      <Screen title="Task" back>
        <EmptyState icon="alert-circle-outline" title="Task not found" />
      </Screen>
    );
  }

  const slotsLeft = Math.max(task.slots - task.taken, 0);

  const submit = async () => {
    if (!user || busy) return;
    setError(null);
    setBusy(true);
    const result = await submitTask(task.id, note);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote('');
  };

  return (
    <Screen title="Task" back>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="ribbon-outline" size={26} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.reward}>{formatNaira(task.rewardKobo)}</Text>
        <Text style={styles.slots}>
          {slotsLeft} of {task.slots} slots left
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.description}>{task.description}</Text>
        <InfoRow label="Posted" value={formatDate(task.createdAt)} />
        <InfoRow label="Status" value={task.status === 'open' ? 'Open' : 'Closed'} />
      </Card>

      {blocked && mySubmission ? (
        <Card style={styles.statusCard}>
          <StatusPill
            label={mySubmission.status === 'approved' ? 'Approved' : 'Pending review'}
            tone={mySubmission.status === 'approved' ? 'ok' : 'warn'}
          />
          <Text style={styles.statusText}>
            {mySubmission.status === 'approved'
              ? `${formatNaira(mySubmission.rewardKobo)} was added to your wallet.`
              : 'Your proof is with the admin. Rewards are paid after review.'}
          </Text>
        </Card>
      ) : (
        <View style={styles.form}>
          {mySubmission?.status === 'rejected' ? (
            <Card style={styles.rejected}>
              <Text style={styles.rejectedText}>
                Your last submission was rejected. You can try again with better proof.
              </Text>
            </Card>
          ) : null}
          <TextField
            label="Proof"
            value={note}
            onChangeText={setNote}
            placeholder="Paste your username, link or a short description of what you did"
            multiline
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <MainButton
            label={task.status === 'open' ? 'Submit proof' : 'Task closed'}
            onPress={submit}
            disabled={task.status !== 'open'}
            loading={busy}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  reward: { ...typography.balance, fontSize: 28, color: colors.moneyIn },
  slots: { ...typography.caption, color: colors.textSecondary },
  card: { gap: 6, marginTop: 12 },
  description: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: 6 },
  statusCard: { marginTop: 16, gap: 10, alignItems: 'center', paddingVertical: 22 },
  statusText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  form: { gap: 14, marginTop: 16 },
  rejected: { padding: 12 },
  rejectedText: { ...typography.caption, color: colors.warning, lineHeight: 18 },
});
