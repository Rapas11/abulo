/**
 * All money moves and marketplace actions now call Postgres functions.
 *
 * The SQL functions are the source of truth: they check the real balance,
 * apply fees, and write the ledger. The client can never set a price or move
 * money directly. Every action refreshes the local mirror afterwards.
 */
import { getDb, loadDb, type Task } from './db';
import {
  cardVerifier,
  listingModerator,
  paymentProvider,
  smsProvider,
} from './providers';
import { getSupabase } from './supabase';

export type ApiResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

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

/** True when Postgres does not know this function yet (migration not applied). */
function isMissingFunction(message: string | undefined): boolean {
  const text = (message ?? '').toLowerCase();
  return (
    text.includes('does not exist') ||
    text.includes('could not find the function') ||
    text.includes('pgrst202') ||
    text.includes('function public.') && text.includes('not found')
  );
}

// ---------------------------------------------------------------- wallet

export async function deposit(amountKobo: number): Promise<ApiResult> {
  try {
    await paymentProvider.startDeposit(amountKobo);
  } catch (error) {
    return { ok: false, error: friendlyError((error as Error).message, 'Deposit failed.') };
  }
  await loadDb();
  return { ok: true, data: null };
}

export async function withdraw(
  amountKobo: number,
  bankName: string,
  accountNumber: string,
  accountName: string,
): Promise<ApiResult> {
  // 1. Debit the wallet first — the server owns the money, so it cannot be
  //    spent twice while a transfer is in flight.
  const result = await callRpc('withdraw_money', {
    p_amount_kobo: amountKobo,
    p_bank: bankName,
    p_account_number: accountNumber,
    p_account_name: accountName,
  });
  if (!result.ok) return result;

  // 2. Hand the transfer to the payment provider. The simulated provider is a
  //    no-op (the ledger row is the record); a real one calls the bank API and
  //    settles on the webhook.
  try {
    await paymentProvider.sendPayout({
      amountKobo,
      bank: bankName,
      accountNumber,
      accountName,
    });
  } catch (error) {
    return { ok: false, error: friendlyError((error as Error).message, 'Payout failed.') };
  }

  await loadDb();
  return { ok: true, data: null };
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

/**
 * Asks the SMS provider to deliver the code once ~9 seconds have passed.
 * The provider decides whether that is a real SMS or the simulated one.
 */
export async function checkNumberOrder(orderId: string): Promise<void> {
  const order = getDb().numberOrders.find((item) => item.id === orderId);
  if (!order || order.status !== 'waiting') return;
  if (Date.now() - order.createdAt < 9000) return;

  try {
    await smsProvider.deliver(orderId);
  } catch {
    return;
  }
  await loadDb();
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

/** Asks the card verifier to check the card (simulated: auto-approve). */
export async function pollGiftCard(orderId: string): Promise<void> {
  const order = getDb().giftCards.find((item) => item.id === orderId);
  if (!order || order.status !== 'pending') return;
  if (Date.now() - order.createdAt < 20000) return;

  try {
    await cardVerifier.verify(orderId);
  } catch {
    return;
  }
  await loadDb();
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

/** Asks the moderator to review a listing (simulated: auto-approve). */
export async function pollListing(listingId: string): Promise<void> {
  const listing = getDb().listings.find((item) => item.id === listingId);
  if (!listing || listing.status !== 'pending') return;
  if (Date.now() - listing.createdAt < 25000) return;

  try {
    await listingModerator.review(listingId);
  } catch {
    return;
  }
  await loadDb();
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
  demoMode?: boolean;
}): Promise<ApiResult> {
  const args: Record<string, unknown> = {
    p_markup: settings.numbersMarkupPct,
    p_fee: settings.accountFeePct,
    p_withdrawal_fee_kobo: settings.withdrawalFeeKobo,
  };
  if (settings.demoMode !== undefined) args.p_demo_mode = settings.demoMode;

  const { data, error } = await getSupabase().rpc('admin_update_settings', args);
  if (error) {
    // The project may still run the three-argument version of the function.
    if (settings.demoMode !== undefined && isMissingFunction(error.message)) {
      const legacy = await getSupabase().rpc('admin_update_settings', {
        p_markup: settings.numbersMarkupPct,
        p_fee: settings.accountFeePct,
        p_withdrawal_fee_kobo: settings.withdrawalFeeKobo,
      });
      if (legacy.error) {
        return { ok: false, error: friendlyError(legacy.error.message, 'Could not save settings.') };
      }
      await loadDb();
      return {
        ok: false,
        error: 'Saved. Demo mode needs the database update (run the latest migration).',
      };
    }
    return { ok: false, error: friendlyError(error.message, 'Could not save settings.') };
  }

  await loadDb();
  return { ok: true, data: (data ?? null) as null };
}

// ----------------------------------------------------------- notifications

/** Marks every unread notification of this user as read. */
export async function markNotificationsRead(): Promise<ApiResult> {
  const { error } = await getSupabase().rpc('mark_notifications_read');
  if (error) {
    if (isMissingFunction(error.message)) return { ok: true, data: null };
    return { ok: false, error: friendlyError(error.message, 'Could not update notifications.') };
  }
  await loadDb();
  return { ok: true, data: null };
}

// ----------------------------------------------------------------- quotes

/**
 * The exact price the server will charge for a number.
 * Falls back to null when the quote function is not deployed yet.
 */
export async function quoteNumberPrice(
  countryCode: string,
  serviceId: string,
): Promise<number | null> {
  const { data, error } = await getSupabase().rpc('quote_number_price', {
    p_country_code: countryCode,
    p_service_id: serviceId,
  });
  if (error) return null;
  const value = Number(data);
  return Number.isFinite(value) ? value : null;
}

/** The exact payout the server will credit for a gift card. */
export async function quoteGiftCardPayout(
  brandId: string,
  faceValueUsd: number,
): Promise<number | null> {
  const { data, error } = await getSupabase().rpc('quote_gift_card_payout', {
    p_brand_id: brandId,
    p_face_value_usd: faceValueUsd,
  });
  if (error) return null;
  const value = Number(data);
  return Number.isFinite(value) ? value : null;
}

// --------------------------------------------------------- password reset

/**
 * Requests a password reset code. In demo mode the code comes back so it can
 * be shown on screen; later an email sender takes over and this returns ''.
 */
export async function requestResetCode(email: string): Promise<ApiResult<string>> {
  const { data, error } = await getSupabase().rpc('request_reset_code', {
    p_email: email.trim().toLowerCase(),
  });
  if (error) {
    if (isMissingFunction(error.message)) {
      return { ok: false, error: 'Password reset needs the latest database update.' };
    }
    return { ok: false, error: friendlyError(error.message, 'Could not request a code.') };
  }
  return { ok: true, data: String(data ?? '') };
}

/** Sets a new password with the code from requestResetCode. */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
): Promise<ApiResult> {
  const { data, error } = await getSupabase().rpc('reset_password_with_code', {
    p_email: email.trim().toLowerCase(),
    p_code: code.trim(),
    p_new_password: newPassword,
  });
  if (error) {
    if (isMissingFunction(error.message)) {
      return { ok: false, error: 'Password reset needs the latest database update.' };
    }
    return { ok: false, error: friendlyError(error.message, 'Could not reset the password.') };
  }
  return { ok: true, data: (data ?? true) as null };
}
