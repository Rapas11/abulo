/**
 * Auth state for the whole app. Screens use `useAuth()`; the root layout uses
 * it to send people to the right screen (sign in → verify → PIN → tabs).
 * The storage details live in `auth.ts` — swapping the mock for Supabase
 * will not touch this file, only `auth.ts`.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { backend, type AbuloUser, type AuthResult } from './auth';
import { clearDb } from './db';

type SignUpData = { user: AbuloUser; demoCode: string };

type AuthContextValue = {
  /** False while the saved session is being loaded on app start. */
  ready: boolean;
  user: AbuloUser | null;
  /** True when the user has a PIN and has not unlocked this run of the app. */
  locked: boolean;
  /** Fake email code from the last signup / reset (demo mode only). */
  demoCode: string | null;
  signUp(name: string, email: string, password: string): Promise<AuthResult<SignUpData>>;
  verifyEmail(code: string): Promise<AuthResult<AbuloUser>>;
  resendVerifyCode(): Promise<AuthResult<{ demoCode: string }>>;
  signIn(email: string, password: string): Promise<AuthResult<AbuloUser>>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<AuthResult<{ demoCode: string }>>;
  resetPassword(email: string, code: string, newPassword: string): Promise<AuthResult<true>>;
  setPin(pin: string): Promise<AuthResult<AbuloUser>>;
  unlock(pin: string): Promise<AuthResult<true>>;
  updateName(name: string): Promise<AuthResult<AbuloUser>>;
  listUsers(): Promise<AbuloUser[]>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AbuloUser | null>(null);
  const [locked, setLocked] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await backend.restoreSession();
      if (cancelled) return;
      setUser(restored);
      setLocked(Boolean(restored?.hasPin));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await backend.signUp({ name, email, password });
    if (result.ok) {
      setUser(result.data.user);
      setLocked(false);
      setDemoCode(result.data.demoCode);
    }
    return result;
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    const result = await backend.verifyEmail(code);
    if (result.ok) setUser(result.data);
    return result;
  }, []);

  const resendVerifyCode = useCallback(async () => {
    const result = await backend.resendVerifyCode();
    if (result.ok) setDemoCode(result.data.demoCode);
    return result;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await backend.signIn(email, password);
    if (result.ok) {
      setUser(result.data);
      setLocked(result.data.hasPin);
      setDemoCode(null);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await backend.signOut();
    clearDb();
    setUser(null);
    setLocked(false);
    setDemoCode(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = await backend.requestPasswordReset(email);
    if (result.ok) setDemoCode(result.data.demoCode);
    return result;
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const result = await backend.resetPassword(email, code, newPassword);
      if (result.ok) {
        clearDb();
        setUser(null);
        setLocked(false);
        setDemoCode(null);
      }
      return result;
    },
    [],
  );

  const setPin = useCallback(async (pin: string) => {
    const result = await backend.setPin(pin);
    if (result.ok) {
      setUser(result.data);
      setLocked(false);
    }
    return result;
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const result = await backend.verifyPin(pin);
    if (result.ok) setLocked(false);
    return result;
  }, []);

  const updateName = useCallback(async (name: string) => {
    const result = await backend.updateName(name);
    if (result.ok) setUser(result.data);
    return result;
  }, []);

  const listUsers = useCallback(async () => backend.listUsers(), []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        locked,
        demoCode,
        signUp,
        verifyEmail,
        resendVerifyCode,
        signIn,
        signOut,
        requestPasswordReset,
        resetPassword,
        setPin,
        unlock,
        updateName,
        listUsers,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
