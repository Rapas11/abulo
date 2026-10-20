/**
 * The one confirm sheet. Every spend goes through this, and it always repeats
 * the exact amount before the money leaves the wallet.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MainButton } from '@/components/kit';
import { formatNaira } from '@/lib/money';
import { colors, layout, radius, typography } from '@/theme';

export type ConfirmRow = { label: string; value: string };

export type ConfirmOptions = {
  title: string;
  amountKobo: number;
  rows?: ConfirmRow[];
  note?: string;
  confirmLabel?: string;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  );

  const close = useCallback((value: boolean) => {
    setRequest((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={Boolean(request)}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          {request ? (
            <View style={styles.sheet}>
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
                onPress={() => close(true)}
              />
              <Pressable onPress={() => close(false)} hitSlop={8} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
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
    maxWidth: layout.contentMaxWidth,
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
});
