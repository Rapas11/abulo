import { StyleSheet, Text, View } from 'react-native';

import { PinCreateFlow } from '@/components/PinCreateFlow';
import { Screen } from '@/components/Screen';
import { colors, typography } from '@/theme';

export default function PinSetupScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.title}>Create your PIN</Text>
        <Text style={styles.caption}>
          You will use it to unlock Abulo and approve every money move.
        </Text>
      </View>
      <PinCreateFlow />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 42 },
  title: { fontSize: 26, fontWeight: '600', color: colors.text },
  caption: { ...typography.body, color: colors.textSecondary, marginTop: 8, lineHeight: 21 },
});
