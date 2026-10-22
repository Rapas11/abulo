import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, SmallButton } from '@/components/kit';
import { markNotificationsRead } from '@/lib/api';
import { useDb, unreadCount, type NotificationKind } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { formatNaira } from '@/lib/money';
import { colors, radius, typography } from '@/theme';

const ICONS: Record<NotificationKind, React.ComponentProps<typeof Ionicons>['name']> = {
  number: 'phone-portrait-outline',
  task: 'checkmark-done-outline',
  giftcard: 'gift-outline',
  account: 'people-outline',
  wallet: 'wallet-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const db = useDb();
  const unread = unreadCount(db);

  // Opening the list is the acknowledgement.
  useEffect(() => {
    if (unread > 0) void markNotificationsRead();
  }, [unread]);

  const open = (id: string) => {
    router.push({ pathname: '/notification/[id]', params: { id } });
  };

  return (
    <Screen title="Notifications" back>
      {unread > 0 ? (
        <View style={styles.actions}>
          <SmallButton label="Mark all as read" variant="raised" onPress={() => void markNotificationsRead()} />
        </View>
      ) : null}

      {db.notifications.length ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {db.notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => open(item.id)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
              <View style={styles.iconWrap}>
                <Ionicons name={ICONS[item.kind] ?? 'notifications-outline'} size={20} color={colors.text} />
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.read ? null : <View style={styles.dot} />}
                </View>
                {item.body ? <Text style={styles.subtitle}>{item.body}</Text> : null}
                <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.right}>
                {item.amountKobo ? (
                  <Text
                    style={[
                      styles.amount,
                      { color: item.amountKobo > 0 ? colors.moneyIn : colors.text },
                    ]}>
                    {item.amountKobo > 0 ? '+' : '−'}
                    {formatNaira(Math.abs(item.amountKobo))}
                  </Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="Nothing here yet"
          actionLabel="Browse numbers"
          actionVariant="accent"
          onAction={() => router.push('/numbers')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'flex-start', marginBottom: 14 },
  list: { gap: 10, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.body, fontWeight: '600', color: colors.text, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  subtitle: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
  time: { ...typography.caption, color: colors.textSecondary, opacity: 0.7 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { ...typography.body, fontWeight: '700' },
});
