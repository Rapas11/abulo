import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { Chip, MainButton } from '@/components/kit';
import { deposit } from '@/lib/api';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export default function DepositScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'paying' | 'done'>('form');
  const [paidKobo, setPaidKobo] = useState(0);

  const kobo = Math.round(Number(amount || '0') * 100);

  useEffect(() => {
    if (stage !== 'paying') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await deposit(kobo);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setStage('form');
        return;
      }
      setPaidKobo(kobo);
      setStage('done');
    }, 1600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stage, kobo]);

  const startPayment = () => {
    setError(null);
    if (!amount.trim()) {
      setError('Enter an amount.');
      return;
    }
    if (kobo < 10000) {
      setError('Minimum deposit is ₦100.');
      return;
    }
    if (kobo > 100000000) {
      setError('Maximum demo deposit is ₦1,000,000.');
      return;
    }
    setStage('paying');
  };

  if (stage === 'paying') {
    return (
      <Screen title="Deposit" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.centerTitle}>Contacting Paystack…</Text>
          <Text style={styles.bigAmount}>{formatNaira(kobo)}</Text>
          <FormNotice>Demo checkout — no real money is charged.</FormNotice>
        </View>
      </Screen>
    );
  }

  if (stage === 'done') {
    return (
      <Screen title="Deposit" back scroll={false}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={72} color={colors.moneyIn} />
          <Text style={styles.centerTitle}>Deposit successful</Text>
          <Text style={styles.bigAmount}>{formatNaira(paidKobo)}</Text>
          <Text style={styles.centerCaption}>Your wallet has been topped up.</Text>
        </View>
        <MainButton label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="Deposit" back>
      <FormNotice>Demo mode — Paystack is simulated. No real money is charged.</FormNotice>

      <View style={styles.form}>
        <TextField
          label="Amount (₦)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="number-pad"
        />
        <View style={styles.chips}>
          {QUICK_AMOUNTS.map((quick) => (
            <Chip
              key={quick}
              label={formatNaira(quick * 100)}
              selected={amount === String(quick)}
              onPress={() => setAmount(String(quick))}
            />
          ))}
        </View>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Pay with Paystack" onPress={startPayment} />
        <Text style={styles.hint}>
          In the real app this opens the Paystack checkout in test mode first, then live after
          business approval.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  centerTitle: { ...typography.sectionTitle, color: colors.text },
  bigAmount: { ...typography.balance, fontSize: 30, color: colors.text },
  centerCaption: { ...typography.body, color: colors.textSecondary },
});
