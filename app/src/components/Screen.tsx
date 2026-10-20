import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, typography } from '@/theme';

type Props = {
  title?: string;
  /** Shows a back chevron; falls back to Home when there is no history. */
  back?: boolean;
  children: ReactNode;
  scroll?: boolean;
};

/** Standard screen wrapper: dark background, 16 dp side padding, safe area. */
export function Screen({ title, back = false, children, scroll = true }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const content = (
    <>
      {title || back ? (
        <View style={styles.titleRow}>
          {back ? (
            <Pressable onPress={goBack} hitSlop={12} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
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
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8, marginBottom: 16 },
  backButton: { marginLeft: -8, marginRight: 2, padding: 2 },
  title: { ...typography.screenTitle, color: colors.text },
});
