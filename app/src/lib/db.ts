/**
 * Client-side mirror of the Supabase data.
 *
 * Screens keep reading synchronously through `useDb()`; this module refreshes
 * the mirror from Postgres after every action. All writes happen through the
 * SQL functions in `api.ts`, never from the client directly.
 */
import { useSyncExternalStore } from 'react';

import { COUNTRIES, GIFT_BRANDS, SERVICES, type Country, type GiftBrand, type Service } from './catalog';
import { getSupabase } from './supabase';

export type LedgerKind =
  | 'deposit'
  | 'withdrawal'
  | 'number'
  | 'number_refund'
  | 'task'
  | 'giftcard'
  | 'account_sale'
  | 'account_buy'
  | 'adjustment';

export type LedgerEntry = {
  id: string;
  userId: string;
  kind: LedgerKind;
  title: string;
  subtitle: string;
  /** Signed kobo: positive = money in, negative = money out. */
  amountKobo: number;
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
};

export type NumberOrder = {
  id: string;
  userId: string;
  userName: string;
  countryCode: string;
  countryName: string;
  serviceId: string;
  serviceName: string;
  priceKobo: number;
  phoneNumber: string;
  status: 'waiting' | 'received' | 'cancelled';
  code?: string;
  message?: string;
  createdAt: number;
  receivedAt?: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  rewardKobo: number;
  slots: number;
  taken: number;
  status: 'open' | 'closed';
  createdAt: number;
  createdBy: string;
};

export type Submission = {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  note: string;
  rewardKobo: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
};

export type GiftCardOrder = {
  id: string;
  userId: string;
  userName: string;
  brandId: string;
  brandName: string;
  faceValueUsd: number;
  payoutKobo: number;
  code: string;
  pin?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
};

export type ListingStatus = 'pending' | 'active' | 'sold' | 'rejected';

export type AccountListing = {
  id: string;
  sellerId?: string;
  sellerName: string;
  platform: string;
  title: string;
  description: string;
  priceKobo: number;
  status: ListingStatus;
  buyerId?: string;
  buyerName?: string;
  credentials?: string;
  createdAt: number;
  soldAt?: number;
};

export type Settings = {
  numbersMarkupPct: number;
  accountFeePct: number;
  withdrawalFeeKobo: number;
  /** True while the provider-dependent flows are still simulated. */
  demoMode: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  numbersMarkupPct: 40,
  accountFeePct: 7,
  withdrawalFeeKobo: 5000,
  demoMode: true,
};

export type NotificationKind = 'number' | 'task' | 'giftcard' | 'account' | 'wallet';

export type AppNotification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app route to open when the notification is tapped. */
  link: string;
  amountKobo?: number;
  read: boolean;
  createdAt: number;
};

export type Db = {
  ledger: LedgerEntry[];
  numberOrders: NumberOrder[];
  tasks: Task[];
  submissions: Submission[];
  giftCards: GiftCardOrder[];
  listings: AccountListing[];
  notifications: AppNotification[];
  settings: Settings;
  /** Authoritative balance from the server (sum of every ledger row). */
  balanceKobo: number | null;
  /** Catalog as it is in Postgres — the single source of truth for prices. */
  countries: Country[];
  services: Service[];
  giftBrands: GiftBrand[];
  loading: boolean;
  /** Set when the last refresh failed — the UI shows this instead of ₦0. */
  loadError: string | null;
};

export function balanceOf(db: Db, userId: string): number {
  // The server sums every ledger row; the mirrored copy is only the newest page.
  if (db.balanceKobo !== null) return db.balanceKobo;
  return db.ledger
    .filter((entry) => entry.userId === userId && entry.status === 'completed')
    .reduce((sum, entry) => sum + entry.amountKobo, 0);
}

export function unreadCount(db: Db): number {
  return db.notifications.filter((item) => !item.read).length;
}

export function ledgerFor(db: Db, userId: string): LedgerEntry[] {
  return db.ledger
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

const emptyDb = (): Db => ({
  ledger: [],
  numberOrders: [],
  tasks: [],
  submissions: [],
  giftCards: [],
  listings: [],
  notifications: [],
  settings: { ...DEFAULT_SETTINGS },
  balanceKobo: null,
  countries: COUNTRIES,
  services: SERVICES,
  giftBrands: GIFT_BRANDS,
  loading: false,
  loadError: null,
});

let state: Db = emptyDb();
let loadSeq = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDb(): Db {
  return state;
}

export function clearDb(): void {
  loadSeq += 1;
  state = emptyDb();
  emit();
}

function writeDb(next: Db): void {
  state = next;
  emit();
}

export function useDb(): Db {
  return useSyncExternalStore(subscribeDb, getDb, getDb);
}

// ------------------------------------------------------------------ mappers
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTime = (value: unknown): number => {
  if (!value) return Date.now();
  const parsed = new Date(value as string).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
};

function mapLedger(row: Row): LedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle ?? '',
    amountKobo: toNumber(row.amount_kobo),
    status: row.status,
    createdAt: toTime(row.created_at),
  };
}

function mapNumberOrder(row: Row): NumberOrder {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    countryCode: row.country_code,
    countryName: row.country_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    priceKobo: toNumber(row.price_kobo),
    phoneNumber: row.phone_number,
    status: row.status,
    code: row.code ?? undefined,
    message: row.message ?? undefined,
    createdAt: toTime(row.created_at),
    receivedAt: row.received_at ? toTime(row.received_at) : undefined,
  };
}

function mapTask(row: Row): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rewardKobo: toNumber(row.reward_kobo),
    slots: toNumber(row.slots),
    taken: toNumber(row.taken),
    status: row.status,
    createdAt: toTime(row.created_at),
    createdBy: row.created_by ?? 'abulo',
  };
}

function mapSubmission(row: Row): Submission {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    userId: row.user_id,
    userName: row.user_name,
    note: row.note,
    rewardKobo: toNumber(row.reward_kobo),
    status: row.status,
    createdAt: toTime(row.created_at),
    reviewedAt: row.reviewed_at ? toTime(row.reviewed_at) : undefined,
  };
}

function mapGiftCard(row: Row): GiftCardOrder {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    faceValueUsd: toNumber(row.face_value_usd),
    payoutKobo: toNumber(row.payout_kobo),
    code: row.code,
    pin: row.pin ?? undefined,
    status: row.status,
    createdAt: toTime(row.created_at),
    reviewedAt: row.reviewed_at ? toTime(row.reviewed_at) : undefined,
  };
}

function mapListing(row: Row): AccountListing {
  return {
    id: row.id,
    sellerId: row.seller_id ?? undefined,
    sellerName: row.seller_name,
    platform: row.platform,
    title: row.title,
    description: row.description,
    priceKobo: toNumber(row.price_kobo),
    status: row.status,
    buyerId: row.buyer_id ?? undefined,
    buyerName: row.buyer_name ?? undefined,
    credentials: row.credentials ?? undefined,
    createdAt: toTime(row.created_at),
    soldAt: row.sold_at ? toTime(row.sold_at) : undefined,
  };
}

function mapNotification(row: Row): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body ?? '',
    link: row.link ?? '',
    amountKobo: row.amount_kobo === null || row.amount_kobo === undefined ? undefined : toNumber(row.amount_kobo),
    read: Boolean(row.read_at),
    createdAt: toTime(row.created_at),
  };
}

function mapCountry(row: Row): Country {
  return {
    code: row.code,
    name: row.name,
    dial: row.dial,
    flag: row.flag,
    mult: toNumber(row.mult, 1),
  };
}

function mapService(row: Row): Service {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as Service['icon'],
    baseKobo: toNumber(row.base_kobo),
  };
}

function mapGiftBrand(row: Row): GiftBrand {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as GiftBrand['icon'],
    rateNgn: toNumber(row.rate_ngn),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** True when Postgres says the table or function is not there yet. */
function isMissingObject(error: { message?: string } | null): boolean {
  const text = error?.message?.toLowerCase() ?? '';
  return (
    text.includes('does not exist') ||
    text.includes('could not find the table') ||
    text.includes('could not find the function') ||
    text.includes('schema cache') ||
    text.includes('pgrst205') ||
    text.includes('pgrst202')
  );
}

/**
 * Pulls a fresh copy of everything the signed-in user is allowed to see.
 * RLS decides what that is: regular users get their own rows, admins get the
 * queues as well.
 */
export async function loadDb(): Promise<void> {
  const seq = ++loadSeq;
  const supabase = getSupabase();

  // Mark the mirror busy so screens show a loading state instead of ₦0.
  if (state.loadError === null) setLoading(true);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    if (seq === loadSeq) writeDb(emptyDb());
    return;
  }

  const [
    ledger,
    orders,
    tasks,
    submissions,
    cards,
    listings,
    settings,
    notifications,
    countries,
    services,
    brands,
    balance,
  ] = await Promise.all([
    supabase.from('ledger_entries').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('number_orders').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('submissions').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('gift_cards').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('settings').select('*').eq('id', true).maybeSingle(),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('number_countries').select('*'),
    supabase.from('number_services').select('*'),
    supabase.from('gift_card_brands').select('*'),
    supabase.rpc('wallet_balance'),
  ]);

  if (seq !== loadSeq) return;

  const settingsRow = settings.data as Row | null;
  const previous = getDb();

  // A failed read must not look like an empty wallet.
  const failed = [ledger.error, orders.error, tasks.error, submissions.error, cards.error, listings.error].find(
    (error) => error && !isMissingObject(error),
  );

  writeDb({
    ledger: ((ledger.data ?? []) as Row[]).map(mapLedger),
    numberOrders: ((orders.data ?? []) as Row[]).map(mapNumberOrder),
    tasks: ((tasks.data ?? []) as Row[]).map(mapTask),
    submissions: ((submissions.data ?? []) as Row[]).map(mapSubmission),
    giftCards: ((cards.data ?? []) as Row[]).map(mapGiftCard),
    listings: ((listings.data ?? []) as Row[]).map(mapListing),
    notifications:
      notifications.error && isMissingObject(notifications.error)
        ? previous.notifications
        : ((notifications.data ?? []) as Row[]).map(mapNotification),
    settings: settingsRow
      ? {
          numbersMarkupPct: toNumber(settingsRow.numbers_markup_pct, 40),
          accountFeePct: toNumber(settingsRow.account_fee_pct, 7),
          withdrawalFeeKobo: toNumber(settingsRow.withdrawal_fee_kobo, 5000),
          demoMode: settingsRow.demo_mode === null || settingsRow.demo_mode === undefined
            ? true
            : Boolean(settingsRow.demo_mode),
        }
      : { ...DEFAULT_SETTINGS },
    balanceKobo: balance.error ? previous.balanceKobo : toNumber(balance.data),
    countries: countries.error || !countries.data?.length
      ? previous.countries
      : ((countries.data ?? []) as Row[]).map(mapCountry),
    services: services.error || !services.data?.length
      ? previous.services
      : ((services.data ?? []) as Row[]).map(mapService),
    giftBrands: brands.error || !brands.data?.length
      ? previous.giftBrands
      : ((brands.data ?? []) as Row[]).map(mapGiftBrand),
    loading: false,
    loadError: failed ? failed.message : null,
  });
}

/** Marks the mirror as busy while a refresh runs (pull to refresh). */
export function setLoading(loading: boolean): void {
  state = { ...state, loading };
  emit();
}
