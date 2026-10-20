import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ErrorText, FormNotice, TextField } from '@/components/fields';
import { Card, Chip, EmptyState, InfoRow, MainButton } from '@/components/kit';
import { pollGiftCard, sellGiftCard } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { GIFT_BRANDS } from '@/lib/catalog';
import { useDb } from '@/lib/db';
import { formatNaira } from '@/lib/money';
import { colors, typography } from '@/theme';

const QUICK_VALUES = ['10', '25', '50', '100', '200'];

export default function GiftCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useDb();
  const params = useLocalSearchParams<{ brand?: string }>();
  const brand = GIFT_BRANDS.find((item) => item.id === params.brand);

  const [value, setValue] = useState('25');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const order = orderId ? db.giftCards.find((card) => card.id === orderId) : undefined;

  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    const timer = setInterval(() => {
      void pollGiftCard(order.id);
    }, 2000);
    return () => clearInterval(timer);
  }, [order?.id, order?.status]);

  if (!brand) {
    return (
      <Screen title="Gift card" back>
        <EmptyState icon="gift-outline" title="This gift card is not supported" />
      </Screen>
    );
  }

  const usd = Number(value || '0');
  const payout = Math.round(usd * brand.rateNgn * 100);

  const submit = async () => {
    if (!user || busy) return;
    setError(null);
    if (!Number.isFinite(usd) || usd < 5) {
      setError('Minimum card value is $5.');
      return;
    }
    if (code.trim().length < 6) {
      setError('Enter the full card code.');
      return;
    }
    setBusy(true);
    const result = await sellGiftCard(brand.id, usd, code, pin);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOrderId(result.data.id);
  };

  if (order) {
    return (
      <Screen title={brand.name} back scroll={false}>
        <View style={styles.center}>
          {order.status === 'pending' ? (
            <>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.centerTitle}>Checking your card…</Text>
              <Text style={styles.centerCaption}>
                Demo mode auto-approves after about 20 seconds. Keep this screen open.
              </Text>
            </>
          ) : null}
          {order.status === 'approved' ? (
            <>
              <Ionicons name="checkmark-circle" size={72} color={colors.moneyIn} />
              <Text style={styles.centerTitle}>Card accepted</Text>
              <Text style={styles.bigAmount}>{formatNaira(order.payoutKobo)}</Text>
              <Text style={styles.centerCaption}>The payout was added to your wallet.</Text>
            </>
          ) : null}
          {order.status === 'rejected' ? (
            <>
              <Ionicons name="close-circle" size={72} color={colors.danger} />
              <Text style={styles.centerTitle}>Card rejected</Text>
              <Text style={styles.centerCaption}>
                The card could not be verified. Contact support if this is a mistake.
              </Text>
            </>
          ) : null}
          <Card style={styles.summary}>
            <InfoRow label="Brand" value={order.brandName} />
            <InfoRow label="Face value" value={`$${order.faceValueUsd}`} />
            <InfoRow label="Payout" value={formatNaira(order.payoutKobo)} />
          </Card>
        </View>
        <MainButton label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title={brand.name} back>
      <FormNotice>Demo mode — cards are auto-approved after about 20 seconds.</FormNotice>

      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name={brand.icon} size={28} color={colors.onAccent} />
        </View>
        <Text style={styles.heroRate}>{formatNaira(brand.rateNgn * 100)} per $1</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Card value (USD)"
          value={value}
          onChangeText={setValue}
          placeholder="25"
          keyboardType="decimal-pad"
        />
        <View style={styles.chips}>
          {QUICK_VALUES.map((quick) => (
            <Chip key={quick} label={`$${quick}`} selected={value === quick} onPress={() => setValue(quick)} />
          ))}
        </View>

        <Card style={styles.payoutCard}>
          <InfoRow label="Rate" value={`${formatNaira(brand.rateNgn * 100)} / $1`} />
          <InfoRow label="Card value" value={`$${usd || 0}`} />
          <InfoRow label="You receive" value={formatNaira(payout)} />
        </Card>

        <TextField
          label="Card code"
          value={code}
          onChangeText={setCode}
          placeholder="e.g. AMZN-1234-5678-9012"
          autoCapitalize="characters"
        />
        <TextField
          label="PIN (optional)"
          value={pin}
          onChangeText={setPin}
          placeholder="Card PIN if it has one"
          keyboardType="number-pad"
        />

        {error ? <ErrorText>{error}</ErrorText> : null}
        <MainButton label={`Submit for ${formatNaira(payout)}`} onPress={submit} loading={busy} />
        <Text style={styles.hint}>
          Never share gift card codes anywhere else. Payouts are credited after verification.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, marginTop: 18 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRate: { ...typography.body, color: colors.textSecondary },
  form: { gap: 14, marginTop: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payoutCard: { gap: 4 },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerTitle: { ...typography.sectionTitle, color: colors.text },
  bigAmount: { ...typography.balance, fontSize: 30, color: colors.moneyIn },
  centerCaption: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  summary: { alignSelf: 'stretch', gap: 4, marginTop: 8 },
});
