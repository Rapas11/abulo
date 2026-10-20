import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/AdminGate';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { MainButton, SectionHeader, SmallButton, StatusPill } from '@/components/kit';
import { createTask, setTaskStatus } from '@/lib/api';
import { useDb } from '@/lib/db';
import { formatNaira } from '@/lib/money';
import { colors, radius, typography } from '@/theme';

export default function AdminTasksScreen() {
  const db = useDb();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [slots, setSlots] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const tasks = [...db.tasks].sort((a, b) => b.createdAt - a.createdAt);

  const post = async () => {
    setError(null);
    const rewardKobo = Math.round(Number(reward || '0') * 100);
    const result = await createTask({
      title,
      description,
      rewardKobo,
      slots: Number(slots || '0'),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle('');
    setDescription('');
    setReward('');
    setSlots('50');
    setPosted(true);
  };

  return (
    <AdminShell title="Tasks">
      <FormNotice>Tasks are posted by the admin only at launch.</FormNotice>

      <View style={styles.form}>
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Follow us on TikTok" />
        <TextField
          label="Instructions"
          value={description}
          onChangeText={setDescription}
          placeholder="What should the user do? What proof do they submit?"
          multiline
        />
        <View style={styles.inline}>
          <TextField
            label="Reward (₦)"
            value={reward}
            onChangeText={setReward}
            placeholder="300"
            keyboardType="number-pad"
            style={styles.flex1}
          />
          <TextField
            label="Slots"
            value={slots}
            onChangeText={setSlots}
            placeholder="50"
            keyboardType="number-pad"
            style={styles.flex1}
          />
        </View>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Post task" onPress={post} />
        {posted ? <Text style={styles.saved}>Task posted.</Text> : null}
      </View>

      <SectionHeader title="All tasks" />
      <View style={styles.list}>
        {tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskText}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={styles.taskSub}>
                {formatNaira(task.rewardKobo)} · {task.taken}/{task.slots} taken
              </Text>
            </View>
            <StatusPill
              label={task.status === 'open' ? 'Open' : 'Closed'}
              tone={task.status === 'open' ? 'ok' : 'muted'}
            />
            <SmallButton
              label={task.status === 'open' ? 'Close' : 'Reopen'}
              onPress={() => {
                void setTaskStatus(task.id, task.status === 'open' ? 'closed' : 'open');
              }}
            />
          </View>
        ))}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, marginTop: 16 },
  inline: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  saved: { ...typography.caption, color: colors.moneyIn, textAlign: 'center' },
  list: { gap: 10 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 12,
  },
  taskText: { flex: 1, gap: 2 },
  taskTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  taskSub: { ...typography.caption, color: colors.textSecondary },
});
