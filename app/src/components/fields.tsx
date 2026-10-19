import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, size, typography } from '@/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
};

export function TextField({ label, error, style, inputStyle, secureTextEntry, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, error ? styles.boxError : null]}>
        <TextInput
          {...rest}
          secureTextEntry={secureTextEntry ? hidden : false}
          placeholderTextColor={colors.disabled}
          selectionColor={colors.accent}
          style={[styles.input, inputStyle]}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((current) => !current)} hitSlop={10} style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: string }) {
  return <Text style={styles.errorText}>{children}</Text>;
}

/** Small boxed note. `demo` shows the fake email codes while the backend is mocked. */
export function FormNotice({ tone = 'demo', children }: { tone?: 'demo' | 'info'; children: ReactNode }) {
  const demo = tone === 'demo';
  return (
    <View style={[styles.notice, demo ? styles.noticeDemo : styles.noticeInfo]}>
      <Ionicons
        name={demo ? 'construct-outline' : 'information-circle-outline'}
        size={18}
        color={demo ? colors.warning : colors.textSecondary}
      />
      <Text style={[styles.noticeText, demo && styles.noticeTextDemo]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6 },
  box: {
    height: size.input,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.raised,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: colors.accent },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, height: '100%', color: colors.text, fontSize: 15 },
  eye: { paddingLeft: 8 },
  fieldError: { ...typography.caption, color: colors.danger, marginTop: 6 },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: radius.input,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  noticeDemo: { borderColor: colors.warning },
  noticeInfo: { borderColor: colors.raised },
  noticeText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  noticeTextDemo: { color: colors.text },
});
