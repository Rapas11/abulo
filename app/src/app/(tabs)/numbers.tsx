import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/kit';
import { colors, radius, size, typography } from '@/theme';

export default function NumbersScreen() {
  return (
    <Screen title="Numbers">
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          editable={false}
          placeholder="Search country or service"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>
      {/* TODO(Sprint 4): country/service list from price cache + 40% markup, then the buy flow */}
      <EmptyState icon="globe-outline" title="No countries available yet" actionLabel="Refresh" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    height: size.search,
    borderRadius: radius.search,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
});
