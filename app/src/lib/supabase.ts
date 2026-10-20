/**
 * Supabase client.
 *
 * The publishable key is safe to ship in the app. Session persistence uses
 * AsyncStorage on both native and web (localStorage under the hood).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://wullpbyxutarkrmapxzx.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_TTBM-e8rcldBwpE3Id3TRA_sEpyZUqa';

let client: SupabaseClient | null = null;

/** Created lazily so static web rendering never touches browser storage. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
