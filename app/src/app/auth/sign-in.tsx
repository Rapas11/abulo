import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, TextField } from '@/components/fields';
import { MainButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // On success the root gate takes over (PIN unlock or the tabs).
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>Abulo</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.caption}>Sign in to your wallet</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Sign in" onPress={submit} loading={busy} />
      </View>

      <View style={styles.links}>
        <Link href="/auth/forgot" style={styles.link}>
          Forgot password?
        </Link>
        <View style={styles.row}>
          <Text style={styles.muted}>New to Abulo?</Text>
          <Link href="/auth/sign-up" style={styles.link}>
            Create account
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 42, marginBottom: 30 },
  logo: { fontSize: 26, fontWeight: '800', color: colors.accent, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text },
  caption: { ...typography.body, color: colors.textSecondary, marginTop: 6 },
  form: { gap: 16 },
  links: { marginTop: 30, alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  muted: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.button, color: colors.accent },
});
