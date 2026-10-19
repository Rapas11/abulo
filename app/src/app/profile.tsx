import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, TextField } from '@/components/fields';
import { EntryCard, MainButton, SectionHeader } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateName, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const save = async () => {
    if (busy) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    const result = await updateName(name);
    setBusy(false);
    if (result.ok) setSaved(true);
    else setError(result.error);
  };

  return (
    <Screen title="Profile">
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'A'}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          {user?.verified ? (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.moneyIn} />
              <Text style={styles.verified}>Email verified</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.form}>
        <TextField
          label="Full name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
          }}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        {saved ? <Text style={styles.saved}>Saved</Text> : null}
        <MainButton label="Save changes" onPress={save} loading={busy} />
      </View>

      <SectionHeader title="Security" />
      <EntryCard
        icon="lock-closed-outline"
        title="Change PIN"
        subtitle="Update your 6-digit unlock code"
        onPress={() => router.push('/pin-change')}
      />

      <SectionHeader title="Session" />
      <EntryCard
        icon="log-out-outline"
        title="Sign out"
        subtitle="You can sign back in anytime"
        onPress={signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: colors.onAccent },
  identityText: { flex: 1, gap: 3 },
  name: { ...typography.sectionTitle, color: colors.text },
  email: { ...typography.caption, color: colors.textSecondary },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  verified: { ...typography.caption, color: colors.moneyIn },
  form: { gap: 14, marginTop: 20 },
  saved: { ...typography.caption, color: colors.moneyIn, textAlign: 'center' },
});
