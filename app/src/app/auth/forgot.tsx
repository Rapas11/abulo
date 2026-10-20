import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { MainButton } from '@/components/kit';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

export default function ForgotScreen() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword, demoCode } = useAuth();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (busy) return;
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.ok) setStep('reset');
    else setError(result.error);
  };

  const doReset = async () => {
    if (busy) return;
    setError(null);
    if (!code.trim() || !password) {
      setError('Enter the code and your new password.');
      return;
    }
    setBusy(true);
    const result = await resetPassword(email, code, password);
    setBusy(false);
    if (result.ok) setStep('done');
    else setError(result.error);
  };

  if (step === 'done') {
    return (
      <Screen>
        <View style={styles.doneWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.moneyIn} />
          <Text style={styles.doneTitle}>Password updated</Text>
          <Text style={styles.doneCaption}>Sign in with your new password.</Text>
        </View>
        <MainButton label="Back to sign in" onPress={() => router.replace('/auth/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.caption}>
          {step === 'email'
            ? 'Enter your email and we will send a reset code.'
            : `Enter the code from the email sent to ${email.trim()} and choose a new password.`}
        </Text>
      </View>

      {step === 'reset' && demoCode ? (
        <FormNotice>
          Demo mode, no email is sent yet. Your code is{' '}
          <Text style={styles.code}>{demoCode}</Text>
        </FormNotice>
      ) : null}

      <View style={styles.form}>
        {step === 'email' ? (
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={sendCode}
          />
        ) : (
          <>
            <TextField
              label="Code"
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              inputStyle={styles.codeInput}
            />
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              onSubmitEditing={doReset}
            />
          </>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton
          label={step === 'email' ? 'Send code' : 'Reset password'}
          onPress={step === 'email' ? sendCode : doReset}
          loading={busy}
        />
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.replace('/auth/sign-in')} hitSlop={10}>
          <Text style={styles.link}>Back to sign in</Text>
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
  links: { marginTop: 26, alignItems: 'center', gap: 14 },
  link: { ...typography.button, color: colors.accent },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  doneTitle: { fontSize: 22, fontWeight: '600', color: colors.text, marginTop: 8 },
  doneCaption: { ...typography.body, color: colors.textSecondary },
});
