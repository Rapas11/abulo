import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, Chip, EmptyState } from '@/components/kit';
import { colors, typography } from '@/theme';

const CATEGORIES = ['All', 'Facebook', 'Instagram', 'TikTok', 'X', 'Call of Duty', 'Other'];

export default function MarketScreen() {
  const [category, setCategory] = useState('All');

  return (
    <Screen title="Market">
      <View style={styles.chips}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </View>

      <Card style={styles.note}>
        <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
        <Text style={styles.noteText}>
          Protected by escrow — your money is held until you confirm the account works.
        </Text>
      </Card>

      {/* TODO(Sprint 7): live listings from approved sellers, filters, escrow orders */}
      <EmptyState
        icon="pricetags-outline"
        title="No accounts for sale yet"
        actionLabel="Become a seller"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 17 },
});
