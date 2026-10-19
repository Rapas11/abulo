import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { colors } from '@/theme';

/** Abulo is dark-mode only — force the dark theme with our palette. */
const abuloTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.raised,
    notification: colors.accent,
  },
};

/** Screens a signed-out person is allowed to see. */
const GUEST_SCREENS = ['sign-in', 'sign-up', 'forgot'];

/**
 * Sends people to the right first screen:
 * signed out → sign in · not verified → confirm email · locked → PIN unlock ·
 * no PIN yet → create PIN · otherwise → the tabs.
 */
function AuthGate() {
  const { ready, user, locked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'auth';
    const authScreen = inAuth ? (segments as string[])[1] : undefined;

    let target: Href | null = null;
    if (!user) {
      target = inAuth && GUEST_SCREENS.includes(authScreen ?? '') ? null : '/auth/sign-in';
    } else if (!user.verified) {
      target = authScreen === 'verify' ? null : '/auth/verify';
    } else if (locked) {
      target = authScreen === 'pin-lock' ? null : '/auth/pin-lock';
    } else if (!user.hasPin) {
      target = authScreen === 'pin-setup' ? null : '/auth/pin-setup';
    } else if (inAuth) {
      target = '/';
    }

    if (target) router.replace(target);
  }, [ready, user, locked, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={abuloTheme}>
        <StatusBar style="light" />
        <AuthGate />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
