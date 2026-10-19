import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PinDots, PinPad } from '@/components/PinPad';
import { ErrorText } from '@/components/fields';
import { useAuth } from '@/lib/auth-context';
import { colors, typography } from '@/theme';

/**
 * The two-step "choose a PIN, repeat it" flow.
 * Used by first-time setup and by "Change PIN" on the profile screen.
 */
export function PinCreateFlow({ onSaved }: { onSaved?: () => void }) {
  const { setPin } = useAuth();
  const [step, setStep] = useState<'create' | 'repeat'>('create');
  const [pin, setPinValue] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pin.length !== 6 || busy) return;

    if (step === 'create') {
      setFirst(pin);
      setPinValue('');
      setError(null);
      setStep('repeat');
      return;
    }

    if (pin !== first) {
      setFirst('');
      setPinValue('');
      setStep('create');
      setError("Those PINs don't match. Start again.");
      return;
    }

    setBusy(true);
    (async () => {
      const result = await setPin(pin);
      setBusy(false);
      if (result.ok) {
        onSaved?.();
      } else {
        setFirst('');
        setPinValue('');
        setStep('create');
        setError(result.error);
      }
    })();
  }, [pin, step, first, busy, setPin, onSaved]);

  return (
    <View style={styles.wrap}>
      <PinDots filled={pin.length} error={Boolean(error)} />
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <ErrorText>{error}</ErrorText>
      ) : (
        <Text style={styles.hint}>
          {step === 'create' ? 'Enter a 6-digit PIN' : 'Enter it again to confirm'}
        </Text>
      )}
      <PinPad value={pin} onChange={setPinValue} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: 28, paddingBottom: 12 },
  hint: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
