import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinDots, PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { ErrorText } from '@/components/fields';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export default function PinLockScreen() {
  const { user, unlock, signOut } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (pin.length !== 6 || cooldown > 0) return;
    (async () => {
      const result = await unlock(pin);
      if (result.ok) return; // the gate moves on to the tabs
      setPin('');
      const next = attempts + 1;
      if (next >= MAX_ATTEMPTS) {
        setAttempts(0);
        setCooldown(COOLDOWN_SECONDS);
        setError(`Too many tries. Wait ${COOLDOWN_SECONDS} seconds before trying again.`);
      } else {
        setAttempts(next);
        setError(
          `Wrong PIN. ${MAX_ATTEMPTS - next} ${MAX_ATTEMPTS - next === 1 ? 'try' : 'tries'} left.`,
        );
      }
    })();
  }, [pin, cooldown, attempts, unlock]);

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.title}>Welcome back{firstName ? `, ${firstName}` : ''}</Text>
        <Text style={styles.caption}>Enter your 6-digit PIN to continue.</Text>
      </View>

      <View style={styles.pinArea}>
        <PinDots filled={pin.length} error={Boolean(error)} />
        {cooldown > 0 ? (
          <Text style={styles.cooldown}>Try again in {cooldown}s</Text>
        ) : error ? (
          <ErrorText>{error}</ErrorText>
        ) : null}
        <PinPad value={pin} onChange={setPin} disabled={cooldown > 0} />
      </View>

      <Pressable onPress={signOut} hitSlop={10} style={styles.switch}>
        <Text style={styles.switchText}>Sign in with password instead</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 42, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '600', color: colors.text, textAlign: 'center' },
  caption: { ...typography.body, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  pinArea: { flex: 1, justifyContent: 'center', gap: 28, paddingBottom: 12 },
  cooldown: { ...typography.body, color: colors.warning, textAlign: 'center' },
  switch: { alignItems: 'center', paddingBottom: 8 },
  switchText: { ...typography.button, color: colors.accent },
});
