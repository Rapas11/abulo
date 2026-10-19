import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, TextField } from '@/components/fields';
import { MainButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in all three fields.');
      return;
    }
    setBusy(true);
    const result = await signUp(name, email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // On success the gate sends us to email confirmation.
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.caption}>One wallet, four marketplaces.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chinedu Okafor"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Create account" onPress={submit} loading={busy} />
      </View>

      <View style={styles.links}>
        <View style={styles.row}>
          <Text style={styles.muted}>Already have an account?</Text>
          <Link href="/auth/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 42, marginBottom: 30 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text },
  caption: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  form: { gap: 16 },
  links: { marginTop: 30, alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  muted: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.button, color: colors.accent },
});
