import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { copyText } from '@/lib/clipboard';
import { colors, radius, typography } from '@/theme';

/**
 * Copies a value to the clipboard and confirms in place for two seconds.
 * Used next to verification codes and long text people need to move
 * somewhere else quickly.
 */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const press = async () => {
    const ok = await copyText(value);
    setState(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  const copied = state === 'copied';
  const failed = state === 'failed';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: colors.pressed }]}>
      <Ionicons
        name={copied ? 'checkmark-circle' : failed ? 'alert-circle-outline' : 'copy-outline'}
        size={16}
        color={copied ? colors.moneyIn : failed ? colors.warning : colors.text}
      />
      <Text
        style={[
          styles.label,
          copied && { color: colors.moneyIn },
          failed && { color: colors.warning },
        ]}>
        {copied ? 'Copied' : failed ? 'Copy blocked' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.raised,
    borderRadius: radius.smallButton,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: { ...typography.button, fontSize: 13, color: colors.text },
});
