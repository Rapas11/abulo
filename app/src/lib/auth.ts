/**
 * Auth backend — Sprint 1 runs on a local mock.
 *
 * Everything (sign up, verify, sign in, PIN, password reset) works on the device
 * with AsyncStorage, so the app is fully usable before the real backend exists.
 * When the Supabase project is created, only this file changes: implement
 * `AuthBackend` with Supabase and export it as `backend`. Screens never import
 * this file — they talk to `AuthProvider` (src/lib/auth-context.tsx).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type AbuloUser = {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  hasPin: boolean;
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
};

type StoredUser = Omit<AbuloUser, 'hasPin'> & {
  passwordHash: string;
  salt: string;
  pinHash: string | null;
  /** Fake email codes. The verification/reset screens show these in demo mode. */
  verifyCode: string | null;
  resetCode: string | null;
};

const USERS_KEY = 'abulo.auth.users.v1';
const SESSION_KEY = 'abulo.auth.session.v1';
const FAKE_LATENCY_MS = 350;

let currentUserId: string | null = null;

const delay = (ms = FAKE_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadUsers(): Promise<Record<string, StoredUser>> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, StoredUser>;
  } catch {
    return {};
  }
}

async function saveUsers(users: Record<string, StoredUser>) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hash(value: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value}`);
}

function randomCode() {
  const value = Crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + value);
}

function toPublic(user: StoredUser): AbuloUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    hasPin: Boolean(user.pinHash),
    createdAt: user.createdAt,
  };
}

async function currentUser(users: Record<string, StoredUser>): Promise<StoredUser | undefined> {
  if (!currentUserId) return undefined;
  return Object.values(users).find((user) => user.id === currentUserId);
}

export const backend: AuthBackend = {
  async restoreSession() {
    const id = await AsyncStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const users = await loadUsers();
    const user = Object.values(users).find((u) => u.id === id);
    if (!user) return null;
    currentUserId = user.id;
    return toPublic(user);
  },

  async signUp({ name, email, password }) {
    await delay();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) return { ok: false, error: 'Enter your full name.' };
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) return { ok: false, error: 'Enter a valid email address.' };
    if (password.length < 8) {
      return { ok: false, error: 'Use at least 8 characters for your password.' };
    }

    const users = await loadUsers();
    if (users[cleanEmail]) {
      return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
    }

    const salt = Crypto.randomUUID();
    const user: StoredUser = {
      id: Crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      verified: false,
      createdAt: Date.now(),
      passwordHash: await hash(password, salt),
      salt,
      pinHash: null,
      verifyCode: randomCode(),
      resetCode: null,
    };
    users[cleanEmail] = user;
    await saveUsers(users);
    await AsyncStorage.setItem(SESSION_KEY, user.id);
    currentUserId = user.id;
    return { ok: true, data: { user: toPublic(user), demoCode: user.verifyCode ?? '' } };
  },

  async verifyEmail(code) {
    await delay();
    const users = await loadUsers();
    const user = await currentUser(users);
    if (!user) return { ok: false, error: 'Session expired. Sign in again.' };
    if (!user.verifyCode || user.verifyCode !== code.trim()) {
      return { ok: false, error: 'That code is not correct. Check it and try again.' };
    }
    user.verifyCode = null;
    user.verified = true;
    await saveUsers(users);
    return { ok: true, data: toPublic(user) };
  },

  async resendVerifyCode() {
    await delay();
    const users = await loadUsers();
    const user = await currentUser(users);
    if (!user) return { ok: false, error: 'Session expired. Sign in again.' };
    user.verifyCode = randomCode();
    await saveUsers(users);
    return { ok: true, data: { demoCode: user.verifyCode } };
  },

  async signIn(email, password) {
    await delay();
    const cleanEmail = email.trim().toLowerCase();
    const users = await loadUsers();
    const user = users[cleanEmail];
    if (!user || (await hash(password, user.salt)) !== user.passwordHash) {
      return { ok: false, error: 'Wrong email or password.' };
    }
    await AsyncStorage.setItem(SESSION_KEY, user.id);
    currentUserId = user.id;
    return { ok: true, data: toPublic(user) };
  },

  async signOut() {
    await AsyncStorage.removeItem(SESSION_KEY);
    currentUserId = null;
  },

  async requestPasswordReset(email) {
    await delay();
    const users = await loadUsers();
    const user = users[email.trim().toLowerCase()];
    if (!user) return { ok: false, error: 'No Abulo account uses this email.' };
    user.resetCode = randomCode();
    await saveUsers(users);
    return { ok: true, data: { demoCode: user.resetCode } };
  },

  async resetPassword(email, code, newPassword) {
    await delay();
    if (newPassword.length < 8) {
      return { ok: false, error: 'Use at least 8 characters for your password.' };
    }
    const users = await loadUsers();
    const user = users[email.trim().toLowerCase()];
    if (!user || !user.resetCode || user.resetCode !== code.trim()) {
      return { ok: false, error: 'That code is not correct. Check it and try again.' };
    }
    user.passwordHash = await hash(newPassword, user.salt);
    user.resetCode = null;
    await saveUsers(users);
    return { ok: true, data: true };
  },

  async setPin(pin) {
    await delay(250);
    if (!/^\d{6}$/.test(pin)) return { ok: false, error: 'Your PIN must be exactly 6 digits.' };
    const users = await loadUsers();
    const user = await currentUser(users);
    if (!user) return { ok: false, error: 'Session expired. Sign in again.' };
    user.pinHash = await hash(pin, user.salt);
    await saveUsers(users);
    return { ok: true, data: toPublic(user) };
  },

  async verifyPin(pin) {
    await delay(250);
    const users = await loadUsers();
    const user = await currentUser(users);
    if (!user || !user.pinHash) return { ok: false, error: 'No PIN set on this account.' };
    const attempt = await hash(pin, user.salt);
    if (attempt !== user.pinHash) return { ok: false, error: 'Wrong PIN.' };
    return { ok: true, data: true };
  },

  async updateName(name) {
    await delay();
    const cleanName = name.trim();
    if (!cleanName) return { ok: false, error: 'Name cannot be empty.' };
    const users = await loadUsers();
    const user = await currentUser(users);
    if (!user) return { ok: false, error: 'Session expired. Sign in again.' };
    user.name = cleanName;
    await saveUsers(users);
    return { ok: true, data: toPublic(user) };
  },
};
