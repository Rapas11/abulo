import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

/** Six dots that fill as the PIN is typed. */
export function PinDots({ filled, error }: { filled: number; error?: boolean }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < filled && styles.dotFilled,
            error && index >= filled ? styles.dotError : null,
          ]}
        />
      ))}
    </View>
  );
}

export function PinPad({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const press = (key: string) => {
    if (disabled) return;
    if (key === 'back') {
      onChange(value.slice(0, -1));
    } else if (value.length < 6) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.pad}>
      {KEYS.map((key, index) =>
        key === '' ? (
          <View key={index} style={styles.key} />
        ) : (
          <Pressable
            key={index}
            disabled={disabled}
            onPress={() => press(key)}
            style={({ pressed }) => [
              styles.key,
              pressed && { backgroundColor: colors.pressed },
              disabled && styles.keyDisabled,
            ]}>
            {key === 'back' ? (
              <Ionicons name="backspace-outline" size={26} color={colors.text} />
            ) : (
              <Text style={styles.keyLabel}>{key}</Text>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.disabled,
  },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotError: { borderColor: colors.danger },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 260,
    alignSelf: 'center',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDisabled: { opacity: 0.35 },
  keyLabel: { fontSize: 26, fontWeight: '500', color: colors.text },
});
