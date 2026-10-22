import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AdminShell } from '@/components/AdminGate';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { MainButton } from '@/components/kit';
import { updateSettings } from '@/lib/api';
import { useDb } from '@/lib/db';
import { colors, typography } from '@/theme';

export default function AdminSettingsScreen() {
  const db = useDb();
  const [markup, setMarkup] = useState(String(db.settings.numbersMarkupPct));
  const [fee, setFee] = useState(String(db.settings.accountFeePct));
  const [withdrawalFee, setWithdrawalFee] = useState(String(db.settings.withdrawalFeeKobo / 100));
  const [demoMode, setDemoMode] = useState(db.settings.demoMode);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setError(null);
    setSaved(false);
    const result = await updateSettings({
      numbersMarkupPct: Number(markup),
      accountFeePct: Number(fee),
      withdrawalFeeKobo: Math.round(Number(withdrawalFee) * 100),
      demoMode,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  };

  return (
    <AdminShell title="Settings">
      <FormNotice>Changes apply to new orders only. Past orders keep their prices.</FormNotice>

      <View style={styles.form}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Numbers</Text>
          <TextField
            label="Markup (%)"
            value={markup}
            onChangeText={setMarkup}
            keyboardType="numeric"
            placeholder="40"
          />
          <Text style={styles.hint}>
            Added on top of the provider price. 40% is the locked launch value.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accounts</Text>
          <TextField
            label="Sale fee (%)"
            value={fee}
            onChangeText={setFee}
            keyboardType="numeric"
            placeholder="7"
          />
          <Text style={styles.hint}>
            Taken from each account sale. The seller receives the rest.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Withdrawals</Text>
          <TextField
            label="Flat fee (₦)"
            value={withdrawalFee}
            onChangeText={setWithdrawalFee}
            keyboardType="numeric"
            placeholder="50"
          />
          <Text style={styles.hint}>Charged once per withdrawal, on top of the amount sent.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Demo mode</Text>
          <View style={styles.switchRow}>
            <View style={styles.flex1}>
              <Text style={styles.switchLabel}>
                {demoMode ? 'Simulated providers are on' : 'Real providers expected'}
              </Text>
              <Text style={styles.hint}>
                While demo mode is on, deposits are free, numbers and gift cards are simulated and
                sellers can approve their own work. Turn it off once Paystack and the SMS provider
                are connected.
              </Text>
            </View>
            <Switch
              value={demoMode}
              onValueChange={setDemoMode}
              trackColor={{ true: colors.accent, false: colors.raised }}
              thumbColor={colors.text}
            />
          </View>
        </View>

        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label="Save settings" onPress={save} />
        {saved ? <Text style={styles.saved}>Settings saved.</Text> : null}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, marginTop: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTitle: { ...typography.body, fontWeight: '600', color: colors.text },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { ...typography.body, color: colors.text, marginBottom: 4 },
  flex1: { flex: 1 },
  saved: { ...typography.caption, color: colors.moneyIn, textAlign: 'center' },
});
