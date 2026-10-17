import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ReactNode } from 'react';

import { colors, size, typography } from '@/theme';

import type { IconName } from '@/components/kit';

function tabIcon(
  filled: IconName,
  outline: IconName,
  color: string | undefined,
  focused: boolean,
): ReactNode {
  return <Ionicons name={focused ? filled : outline} size={size.tabIcon} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.raised,
          height: size.tabBar,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: typography.tabLabel.fontSize,
          fontWeight: typography.tabLabel.fontWeight,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            tabIcon('home', 'home-outline', typeof color === 'string' ? color : undefined, focused),
        }}
      />
      <Tabs.Screen
        name="numbers"
        options={{
          title: 'Numbers',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(
              'phone-portrait',
              'phone-portrait-outline',
              typeof color === 'string' ? color : undefined,
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(
              'bag-handle',
              'bag-handle-outline',
              typeof color === 'string' ? color : undefined,
              focused,
            ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: 'Earn',
          tabBarIcon: ({ color, focused }) =>
            tabIcon('cash', 'cash-outline', typeof color === 'string' ? color : undefined, focused),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) =>
            tabIcon(
              'wallet',
              'wallet-outline',
              typeof color === 'string' ? color : undefined,
              focused,
            ),
        }}
      />
    </Tabs>
  );
}
