/**
 * Real authentication + device PIN, backed by Supabase Auth.
 *
 * The rest of the app only talks to this module through `AuthBackend`.
 * The PIN is a local device lock (stored hashed in AsyncStorage), while the
 * account itself lives in Supabase.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { getSupabase } from './supabase';

export type AbuloUser = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  hasPin: boolean;
  role: 'admin' | 'user';
  createdAt: number;
};

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AuthBackend = {
  /** The signed-in user from the last run, if any. */
  restoreSession(): Promise<AbuloUser | null>;
  signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult<{ user: AbuloUser; demoCode: string }>>;
  verifyEmail(code: string): Promise<AuthResult<AbuloUser>>;
  resendVerifyCode(): Promise<AuthResult<{ demoCode: string }>>;
  signIn(email: string, password: string): Promise<AuthResult<AbuloUser>>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<AuthResult<{ demoCode: string }>>;
  resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<AuthResult<true>>;
  setPin(pin: string): Promise<AuthResult<AbuloUser>>;
  verifyPin(pin: string): Promise<AuthResult<true>>;
  updateName(name: string): Promise<AuthResult<AbuloUser>>;
  /** Every account visible to the admin directory. */
  listUsers(): Promise<AbuloUser[]>;
};

const PENDING_EMAIL_KEY = 'abulo.auth.pending-email.v1';
const PIN_KEY = (userId: string) => `abulo.pin.v1.${userId}`;

type StoredPin = { salt: string; hash: string };

function friendlyAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'Wrong email or password.';
  if (text.includes('email not confirmed')) return 'Confirm your email first — check your inbox.';
  if (text.includes('already registered') || text.includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (text.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (text.includes('should be different from the old password')) {
    return 'Choose a password you have not used before.';
  }
  if (text.includes('token has expired') || text.includes('invalid') && text.includes('token')) {
    return 'That code is invalid or expired.';
  }
  if (text.includes('for security purposes') || text.includes('rate limit')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (text.includes('invalid email')) return 'Enter a valid email address.';
  if (text.includes('fetch') || text.includes('network')) {
    return 'Network error. Check your connection and try again.';
  }
  return message;
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

async function readPin(userId: string): Promise<StoredPin | null> {
  const raw = await AsyncStorage.getItem(PIN_KEY(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPin;
  } catch {
    return null;
  }
}

async function hasPin(userId: string): Promise<boolean> {
  return Boolean(await readPin(userId));
}

async function mapUser(authUser: User): Promise<AbuloUser> {
  const supabase = getSupabase();
  const email = authUser.email ?? '';
  const metadataName =
    typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : '';

  let profile: { name: string; role: 'admin' | 'user'; created_at: string } | null = null;
  const { data } = await supabase
    .from('profiles')
    .select('name, role, created_at')
    .eq('id', authUser.id)
    .maybeSingle();
  if (data) profile = data as { name: string; role: 'admin' | 'user'; created_at: string };

  return {
    id: authUser.id,
    name: profile?.name ?? metadataName ?? email.split('@')[0] ?? 'Abulo user',
    email,
    verified: Boolean(authUser.email_confirmed_at ?? authUser.confirmed_at),
    hasPin: await hasPin(authUser.id),
    role: profile?.role ?? 'user',
    createdAt: profile ? new Date(profile.created_at).getTime() : new Date(authUser.created_at).getTime(),
  };
}

export const backend: AuthBackend = {
  async restoreSession() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) return null;
    return mapUser(data.session.user);
  },

  async signUp({ name, email, password }) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) return { ok: false, error: 'Enter your full name.' };
    if (!cleanEmail) return { ok: false, error: 'Enter your email address.' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName } },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    if (!data.user) return { ok: false, error: 'Could not create the account. Try again.' };
    if (data.user.identities && data.user.identities.length === 0) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    await AsyncStorage.setItem(PENDING_EMAIL_KEY, cleanEmail);
    return {
      ok: true,
      data: { user: await mapUser(data.user), demoCode: '' },
    };
  },

  async verifyEmail(code) {
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) return { ok: false, error: 'Enter the 6-digit code.' };

    const supabase = getSupabase();
    const email =
      (await AsyncStorage.getItem(PENDING_EMAIL_KEY)) ??
      (await supabase.auth.getUser()).data.user?.email ??
      '';
    if (!email) return { ok: false, error: 'Request a new code.' };

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: cleanCode,
      type: 'signup',
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    if (!data.user) return { ok: false, error: 'Could not verify the email.' };

    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
    return { ok: true, data: await mapUser(data.user) };
  },

  async resendVerifyCode() {
    const supabase = getSupabase();
    const email = await AsyncStorage.getItem(PENDING_EMAIL_KEY);
    if (!email) return { ok: false, error: 'Go back and sign up again.' };

    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, data: { demoCode: '' } };
  },

  async signIn(email, password) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    if (!data.user) return { ok: false, error: 'Sign in failed. Try again.' };
    return { ok: true, data: await mapUser(data.user) };
  },

  async signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
  },

  async requestPasswordReset(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { ok: false, error: 'Enter your email address.' };

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true, data: { demoCode: '' } };
  },

  async resetPassword(email, code, newPassword) {
    if (newPassword.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }
    const supabase = getSupabase();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    });
    if (verifyError) return { ok: false, error: friendlyAuthError(verifyError.message) };

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return { ok: false, error: friendlyAuthError(updateError.message) };

    // Make the person sign in again with the new password.
    await supabase.auth.signOut();
    return { ok: true, data: true };
  },

  async setPin(pin) {
    if (!/^\d{6}$/.test(pin)) return { ok: false, error: 'PIN must be 6 digits.' };
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { ok: false, error: 'Session expired. Sign in again.' };

    const salt = Crypto.randomUUID();
    const hash = await hashPin(pin, salt);
    await AsyncStorage.setItem(PIN_KEY(data.user.id), JSON.stringify({ salt, hash }));
    return { ok: true, data: await mapUser(data.user) };
  },

  async verifyPin(pin) {
    if (!/^\d{6}$/.test(pin)) return { ok: false, error: 'Wrong PIN.' };
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: 'Session expired. Sign in again.' };

    const stored = await readPin(data.user.id);
    if (!stored) return { ok: false, error: 'No PIN set on this account.' };

    const attempt = await hashPin(pin, stored.salt);
    if (attempt !== stored.hash) return { ok: false, error: 'Wrong PIN.' };
    return { ok: true, data: true };
  },

  async updateName(name) {
    const cleanName = name.trim();
    if (!cleanName) return { ok: false, error: 'Name cannot be empty.' };

    const supabase = getSupabase();
    const { error } = await supabase.rpc('update_my_name', { p_name: cleanName });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { name: cleanName },
    });
    if (metadataError) return { ok: false, error: friendlyAuthError(metadataError.message) };

    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: 'Session expired. Sign in again.' };
    return { ok: true, data: await mapUser(data.user) };
  },

  async listUsers() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, created_at')
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: '',
      verified: true,
      hasPin: false,
      role: row.role as 'admin' | 'user',
      createdAt: new Date(row.created_at).getTime(),
    }));
  },
};
