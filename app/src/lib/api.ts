/**
 * All money moves and marketplace actions now call Postgres functions.
 *
 * The SQL functions are the source of truth: they check the real balance,
 * apply fees, and write the ledger. The client can never set a price or move
 * money directly. Every action refreshes the local mirror afterwards.
 */
import { getDb, loadDb, type Task } from './db';
import { getSupabase } from './supabase';

export type ApiResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const OK: ApiResult = { ok: true, data: null };

function friendlyError(message: string | undefined, fallback: string): string {
  const text = (message ?? '').toLowerCase();
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'Network error. Check your connection and try again.';
  }
  if (text.includes('jwt') || text.includes('not signed in') || text.includes('please sign in')) {
    return 'Session expired. Sign in again.';
  }
  return message?.trim() || fallback;
}

async function callRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<ApiResult<T>> {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) return { ok: false, error: friendlyError(error.message, 'Something went wrong.') };
  await loadDb();
  return { ok: true, data: data as T };
}

// ---------------------------------------------------------------- wallet

export async function deposit(amountKobo: number): Promise<ApiResult> {
  return callRpc('deposit_demo', { p_amount_kobo: amountKobo });
}

export async function withdraw(
  amountKobo: number,
  bankName: string,
  accountNumber: string,
  accountName: string,
): Promise<ApiResult> {
  return callRpc('withdraw_money', {
    p_amount_kobo: amountKobo,
    p_bank: bankName,
    p_account_number: accountNumber,
    p_account_name: accountName,
  });
}

// --------------------------------------------------------------- numbers

export async function buyNumber(
  countryCode: string,
  serviceId: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await callRpc<{ id: string }>('buy_number', {
    p_country_code: countryCode,
    p_service_id: serviceId,
  });
  if (!result.ok) return result;
  return { ok: true, data: { id: result.data.id } };
}

/** Asks the server to deliver the demo SMS once ~9 seconds have passed. */
export async function checkNumberOrder(orderId: string): Promise<void> {
  const order = getDb().numberOrders.find((item) => item.id === orderId);
  if (!order || order.status !== 'waiting') return;
  if (Date.now() - order.createdAt < 9000) return;

  const { data, error } = await getSupabase().rpc('simulate_sms', { p_order_id: orderId });
  if (!error && data && (data as { status?: string }).status === 'received') {
    await loadDb();
  }
}

export async function cancelNumber(orderId: string): Promise<ApiResult> {
  return callRpc('cancel_number', { p_order_id: orderId });
}

// ----------------------------------------------------------------- tasks

export async function createTask(input: {
  title: string;
  description: string;
  rewardKobo: number;
  slots: number;
}): Promise<ApiResult<Task>> {
  return callRpc('admin_create_task', {
    p_title: input.title,
    p_description: input.description,
    p_reward_kobo: input.rewardKobo,
    p_slots: input.slots,
  });
}

export async function setTaskStatus(taskId: string, status: 'open' | 'closed'): Promise<ApiResult> {
  return callRpc('admin_set_task_status', { p_task_id: taskId, p_status: status });
}

export async function submitTask(taskId: string, note: string): Promise<ApiResult> {
  return callRpc('submit_task', { p_task_id: taskId, p_note: note });
}

export async function reviewSubmission(
  submissionId: string,
  approve: boolean,
): Promise<ApiResult> {
  return callRpc('review_submission', {
    p_submission_id: submissionId,
    p_approve: approve,
  });
}

// ------------------------------------------------------------- gift cards

export async function sellGiftCard(
  brandId: string,
  faceValueUsd: number,
  code: string,
  pin?: string,
): Promise<ApiResult<{ id: string }>> {
  const result = await callRpc<{ id: string }>('sell_gift_card', {
    p_brand_id: brandId,
    p_face_value_usd: faceValueUsd,
    p_code: code,
    p_pin: pin ?? '',
  });
  if (!result.ok) return result;
  return { ok: true, data: { id: result.data.id } };
}

export async function reviewGiftCard(orderId: string, approve: boolean): Promise<ApiResult> {
  return callRpc('review_gift_card', {
    p_order_id: orderId,
    p_approve: approve,
  });
}

/** Demo verification: auto-approves the user's card 20 seconds after upload. */
export async function pollGiftCard(orderId: string): Promise<void> {
  const order = getDb().giftCards.find((item) => item.id === orderId);
  if (!order || order.status !== 'pending') return;
  if (Date.now() - order.createdAt < 20000) return;

  const { data, error } = await getSupabase().rpc('simulate_gift_card_review', {
    p_order_id: orderId,
  });
  if (!error && data && (data as { status?: string }).status !== 'pending') {
    await loadDb();
  }
}

// --------------------------------------------------------------- accounts

export async function createListing(input: {
  platform: string;
  title: string;
  description: string;
  priceKobo: number;
}): Promise<ApiResult<{ id: string }>> {
  const result = await callRpc<{ id: string }>('create_listing', {
    p_platform: input.platform,
    p_title: input.title,
    p_description: input.description,
    p_price_kobo: input.priceKobo,
  });
  if (!result.ok) return result;
  return { ok: true, data: { id: result.data.id } };
}

export async function reviewListing(listingId: string, approve: boolean): Promise<ApiResult> {
  return callRpc('admin_review_listing', {
    p_listing_id: listingId,
    p_approve: approve,
  });
}

/** Demo review: listings go live 25 seconds after posting. */
export async function pollListing(listingId: string): Promise<void> {
  const listing = getDb().listings.find((item) => item.id === listingId);
  if (!listing || listing.status !== 'pending') return;
  if (Date.now() - listing.createdAt < 25000) return;

  const { data, error } = await getSupabase().rpc('simulate_listing_review', {
    p_listing_id: listingId,
  });
  if (!error && data && (data as { status?: string }).status === 'active') {
    await loadDb();
  }
}

export async function buyListing(
  listingId: string,
): Promise<ApiResult<{ credentials: string }>> {
  const result = await callRpc<{ credentials?: string }>('buy_listing', {
    p_listing_id: listingId,
  });
  if (!result.ok) return result;
  return { ok: true, data: { credentials: result.data.credentials ?? '' } };
}

// --------------------------------------------------------------- settings

export async function updateSettings(settings: {
  numbersMarkupPct: number;
  accountFeePct: number;
  withdrawalFeeKobo: number;
}): Promise<ApiResult> {
  return callRpc('admin_update_settings', {
    p_markup: settings.numbersMarkupPct,
    p_fee: settings.accountFeePct,
    p_withdrawal_fee_kobo: settings.withdrawalFeeKobo,
  });
}

export const apiOk = OK;
