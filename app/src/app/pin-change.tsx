import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinCreateFlow } from '@/components/PinCreateFlow';
import { Screen } from '@/components/Screen';
import { colors, typography } from '@/theme';

export default function PinChangeScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Change PIN</Text>
      </View>
      <PinCreateFlow onSaved={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  back: { marginLeft: -6, padding: 4 },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
});
