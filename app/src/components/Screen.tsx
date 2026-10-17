import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, typography } from '@/theme';

type Props = {
  title?: string;
  children: ReactNode;
  scroll?: boolean;
};

/** Standard screen wrapper: dark background, 16 dp side padding, safe area. */
export function Screen({ title, children, scroll = true }: Props) {
  const content = (
    <>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    marginTop: 8,
    marginBottom: 16,
  },
});
