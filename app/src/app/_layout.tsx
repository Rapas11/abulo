import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ConfirmProvider } from '@/components/ConfirmSheet';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { clearDb, loadDb } from '@/lib/db';
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

/** Keeps the local data mirror in sync with the signed-in Supabase user. */
function DataGate() {
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (user?.verified) void loadDb();
    else clearDb();
  }, [ready, user?.id, user?.verified]);

  return null;
}

/**
 * A static host cannot serve `/numbers/order/<id>` on a cold load, so the 404
 * page stores the path and boots the app at its root. This hands the original
 * path back to the router once there is a signed-in person to show it to.
 */
function DeepLinkGate() {
  const { ready, user, locked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user || locked || !user.hasPin) return;

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem('abulo:deep-link');
      if (stored) sessionStorage.removeItem('abulo:deep-link');
    } catch {
      return;
    }
    if (!stored) return;

    // "/abulo/app/numbers/order/x" → "/numbers/order/x"
    const baseIndex = stored.indexOf('/app');
    const path = baseIndex >= 0 ? stored.slice(baseIndex + 4) : stored;
    if (path.startsWith('/')) router.replace(path as Href);
  }, [ready, user, locked, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={abuloTheme}>
        <ConfirmProvider>
          <StatusBar style="light" />
          <AuthGate />
          <DataGate />
          <DeepLinkGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          />
        </ConfirmProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
