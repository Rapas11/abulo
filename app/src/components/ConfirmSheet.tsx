/**
 * The one confirm sheet. Every spend goes through this, and it always repeats
 * the exact amount before the money leaves the wallet.
 *
 * Spends can also require the account PIN: the sheet shows the amount first,
 * then asks for the 6-digit PIN before the action is allowed to run. The PIN
 * is checked against the local hash — it never leaves the device.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MainButton } from '@/components/kit';
import { PinDots, PinPad } from '@/components/PinPad';
import { backend } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { useContentMaxWidth } from '@/lib/layout';
import { formatNaira } from '@/lib/money';
import { colors, radius, typography } from '@/theme';

export type ConfirmRow = { label: string; value: string };

export type ConfirmOptions = {
  title: string;
  amountKobo: number;
  rows?: ConfirmRow[];
  note?: string;
  confirmLabel?: string;
  /** Ask for the 6-digit PIN before the action runs (money moves). */
  requirePin?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [request, setRequest] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const contentMaxWidth = useContentMaxWidth();

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  );

  const close = useCallback((value: boolean) => {
    setPinOpen(false);
    setPin('');
    setPinError(null);
    setRequest((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  // A new request starts from a clean PIN state.
  useEffect(() => {
    setPin('');
    setPinError(null);
    setPinOpen(false);
  }, [request?.options.title]);

  /** Money only moves once the PIN matches. */
  const needsPin = Boolean(request?.options.requirePin && user?.hasPin);

  const verifyPin = useCallback(
    async (value: string) => {
      setPinBusy(true);
      const result = await backend.verifyPin(value);
      setPinBusy(false);
      if (!result.ok) {
        setPinError(result.error);
        setPin('');
        return;
      }
      close(true);
    },
    [close],
  );

  const onPinChange = useCallback(
    (next: string) => {
      setPin(next);
      setPinError(null);
      if (next.length === 6 && !pinBusy) void verifyPin(next);
    },
    [pinBusy, verifyPin],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={Boolean(request) && !pinOpen}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          {request ? (
            <View style={[styles.sheet, { maxWidth: contentMaxWidth }]}>
              <View style={styles.grabber} />
              <Text style={styles.title}>{request.options.title}</Text>
              <Text style={styles.amount}>{formatNaira(request.options.amountKobo)}</Text>
              {request.options.rows?.length ? (
                <View style={styles.rows}>
                  {request.options.rows.map((row) => (
                    <View key={row.label} style={styles.row}>
                      <Text style={styles.rowLabel}>{row.label}</Text>
                      <Text style={styles.rowValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {request.options.note ? <Text style={styles.note}>{request.options.note}</Text> : null}
              <MainButton
                label={request.options.confirmLabel ?? 'Confirm'}
                onPress={() => (needsPin ? setPinOpen(true) : close(true))}
              />
              <Pressable onPress={() => close(false)} hitSlop={8} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={pinOpen && Boolean(request)}
        transparent
        animationType="fade"
        onRequestClose={() => setPinOpen(false)}>
        <View style={styles.pinBackdrop}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Confirm with your PIN</Text>
            <Text style={styles.pinAmount}>
              {request ? formatNaira(request.options.amountKobo) : ''}
            </Text>
            <PinDots filled={pin.length} error={Boolean(pinError)} />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <PinPad value={pin} onChange={onPinChange} disabled={pinBusy} />
            <Pressable onPress={() => setPinOpen(false)} hitSlop={8} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return value;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    paddingBottom: 26,
    gap: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.raised,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  amount: { ...typography.balance, fontSize: 30, color: colors.text, textAlign: 'center' },
  rows: {
    backgroundColor: colors.raised,
    borderRadius: radius.input,
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.text, flexShrink: 1, textAlign: 'right' },
  note: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  cancel: { alignItems: 'center', paddingTop: 2 },
  cancelText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  pinBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pinCard: { alignItems: 'center', gap: 18, width: '100%', maxWidth: 340 },
  pinTitle: { ...typography.sectionTitle, color: colors.text },
  pinAmount: { ...typography.balance, fontSize: 28, color: colors.accent },
  pinError: { ...typography.caption, color: colors.danger },
});
