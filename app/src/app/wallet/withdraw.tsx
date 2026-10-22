import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { Chip, InfoRow, MainButton, SectionHeader } from '@/components/kit';
import { useConfirm } from '@/components/ConfirmSheet';
import { withdraw } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { BANKS } from '@/lib/catalog';
import { balanceOf, useDb } from '@/lib/db';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

export default function WithdrawScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const db = useDb();
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'done'>('form');
  const [paidKobo, setPaidKobo] = useState(0);

  const fee = db.settings.withdrawalFeeKobo;
  const amountKobo = Math.round(Number(amount || '0') * 100);
  const total = amountKobo + fee;
  const balance = user ? balanceOf(db, user.id) : 0;

  const submit = async () => {
    setError(null);
    if (!user) return;
    if (!amount.trim() || amountKobo < 100000) {
      setError('Minimum withdrawal is ₦1,000.');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setError('Account number must be 10 digits.');
      return;
    }
    if (!accountName.trim()) {
      setError('Enter the account name.');
      return;
    }
    if (balance < total) {
      setError('Not enough balance for this withdrawal plus the fee.');
      return;
    }

    const approved = await confirm({
      title: 'Confirm withdrawal',
      amountKobo: total,
      rows: [
        { label: 'You receive', value: formatNaira(amountKobo) },
        { label: 'Fee', value: formatNaira(fee) },
        { label: 'Bank', value: `${bank} · ${accountNumber.slice(-4)}` },
        { label: 'Account name', value: accountName.trim() },
      ],
      note: db.settings.demoMode ? 'Demo payout — no real bank transfer is made.' : undefined,
      confirmLabel: 'Withdraw',
      requirePin: true,
    });
    if (!approved) return;

    const result = await withdraw(amountKobo, bank, accountNumber, accountName.trim());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPaidKobo(amountKobo);
    setStage('done');
  };

  if (stage === 'done') {
    return (
      <Screen title="Withdraw" back scroll={false}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={72} color={colors.moneyIn} />
          <Text style={styles.centerTitle}>Withdrawal sent</Text>
          <Text style={styles.bigAmount}>{formatNaira(paidKobo)}</Text>
          <Text style={styles.centerCaption}>
            {bank} · {accountNumber.slice(-4)}
            {db.settings.demoMode ? ' — demo payout, no real transfer.' : '.'}
          </Text>
        </View>
        <MainButton label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="Withdraw" back>
      {db.settings.demoMode ? (
        <FormNotice>Demo mode — no real bank transfer is made.</FormNotice>
      ) : null}

      <View style={styles.form}>
        <TextField
          label="Amount (₦)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="number-pad"
        />
        <View style={styles.summary}>
          <InfoRow label="Balance" value={formatNaira(balance)} />
          <InfoRow label="Fee" value={formatNaira(fee)} />
          <InfoRow label="Total debited" value={formatNaira(total)} />
        </View>

        <SectionHeader title="Bank" />
        <View style={styles.chips}>
          {BANKS.map((item) => (
            <Chip key={item} label={item} selected={bank === item} onPress={() => setBank(item)} />
          ))}
        </View>

        <TextField
          label="Account number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="0123456789"
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextField
          label="Account name"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="e.g. Bola Ade"
          autoCapitalize="words"
        />

        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Withdraw" onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 20 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  centerTitle: { ...typography.sectionTitle, color: colors.text },
  bigAmount: { ...typography.balance, fontSize: 30, color: colors.text },
  centerCaption: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
