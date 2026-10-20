import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { MainButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

export default function VerifyScreen() {
  const { user, verifyEmail, resendVerifyCode, demoCode, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (!code.trim()) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    const result = await verifyEmail(code);
    setBusy(false);
    if (!result.ok) setError(result.error);
    // On success the gate sends us to PIN setup.
  };

  const resend = async () => {
    setError(null);
    setResent(false);
    const result = await resendVerifyCode();
    if (result.ok) setResent(true);
    else setError(result.error);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.caption}>
          We sent a confirmation email to {user?.email ?? 'your email'}. Enter the 6-digit code if
          your email includes one, or open the confirmation link.
        </Text>
      </View>

      {demoCode ? (
        <FormNotice>
          Demo mode, no email is sent yet. Your code is{' '}
          <Text style={styles.code}>{demoCode}</Text>
        </FormNotice>
      ) : null}

      <View style={styles.form}>
        <TextField
          label="Code"
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          inputStyle={styles.codeInput}
          onSubmitEditing={submit}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        {resent ? <Text style={styles.resent}>A new confirmation email was sent.</Text> : null}
        <MainButton label="Verify email" onPress={submit} loading={busy} />
      </View>

      <View style={styles.links}>
        <Pressable onPress={resend} hitSlop={10}>
          <Text style={styles.link}>Resend code</Text>
        </Pressable>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.muted}>Use a different email</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 42, marginBottom: 22 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text },
  caption: { ...typography.body, color: colors.textSecondary, marginTop: 8, lineHeight: 21 },
  code: { fontWeight: '700', letterSpacing: 2 },
  form: { gap: 16, marginTop: 20 },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 17 },
  resent: { ...typography.caption, color: colors.moneyIn, textAlign: 'center' },
  links: { marginTop: 26, alignItems: 'center', gap: 14 },
  link: { ...typography.button, color: colors.accent },
  muted: { ...typography.body, color: colors.textSecondary },
});
