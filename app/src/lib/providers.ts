/**
 * Provider seams.
 *
 * Every flow that needs an outside company goes through one of these
 * interfaces: payments (Paystack), SMS (5sim) and gift-card verification.
 *
 * Today each provider is simulated — the database generates the code, the
 * card is approved by a timer and deposits are free. When you get real keys:
 *
 *   1. write the real adapter next to the simulated one in this file
 *   2. point the factory function at it
 *   3. turn demo mode off in Admin → Settings
 *
 * No screen, no SQL function and no other file has to change.
 */
import { getSupabase } from './supabase';

/** A provider that is not connected yet must fail loudly, never silently. */
export class ProviderNotConnectedError extends Error {
  constructor(provider: string) {
    super(`${provider} is not connected yet. Turn it on in the provider settings.`);
    this.name = 'ProviderNotConnectedError';
  }
}

export interface SmsProvider {
  readonly name: string;
  /** Delivers the verification code for a number order. */
  deliver(orderId: string): Promise<void>;
}

export interface PaymentProvider {
  readonly name: string;
  /** Starts a top-up and returns the reference the bank will call back with. */
  startDeposit(amountKobo: number): Promise<void>;
  /** Sends money to a bank account. */
  sendPayout(input: {
    amountKobo: number;
    bank: string;
    accountNumber: string;
    accountName: string;
  }): Promise<void>;
}

export interface CardVerifier {
  readonly name: string;
  /** Checks a submitted gift card and approves it. */
  verify(orderId: string): Promise<void>;
}

export interface ListingModerator {
  readonly name: string;
  /** Reviews a freshly posted account listing. */
  review(listingId: string): Promise<void>;
}

/* ------------------------------------------------------------------ SMS */

/**
 * Simulated SMS: the database generates a code a few seconds after the order.
 * Replace `deliver` with the 5sim order call + webhook handler.
 */
export const simulatedSmsProvider: SmsProvider = {
  name: 'Simulated SMS',
  async deliver(orderId) {
    const { error } = await getSupabase().rpc('simulate_sms', { p_order_id: orderId });
    if (error) throw new Error(error.message);
  },
};

/* -------------------------------------------------------------- payments */

/**
 * Simulated payments: deposits are credited immediately and withdrawals are
 * recorded without a bank transfer. Replace with the Paystack checkout and
 * the transfer webhook.
 */
export const simulatedPaymentProvider: PaymentProvider = {
  name: 'Simulated payments',
  async startDeposit(amountKobo) {
    const { error } = await getSupabase().rpc('deposit_demo', { p_amount_kobo: amountKobo });
    if (error) throw new Error(error.message);
  },
  async sendPayout() {
    // The withdrawal is written to the ledger by withdraw_money; a real
    // provider would call the transfer API and settle on the webhook.
  },
};

/* ---------------------------------------------------------- gift cards */

/**
 * Simulated gift-card checks: the card is approved by the database after a
 * short delay. Replace with the verifier API call.
 */
export const simulatedCardVerifier: CardVerifier = {
  name: 'Simulated card checks',
  async verify(orderId) {
    const { error } = await getSupabase().rpc('simulate_gift_card_review', {
      p_order_id: orderId,
    });
    if (error) throw new Error(error.message);
  },
};

/* ------------------------------------------------------------- listings */

/**
 * Simulated moderation: a posted listing goes live on its own. Replace with
 * the admin review flow (admin_review_listing).
 */
export const simulatedListingModerator: ListingModerator = {
  name: 'Simulated moderation',
  async review(listingId) {
    const { error } = await getSupabase().rpc('simulate_listing_review', {
      p_listing_id: listingId,
    });
    if (error) throw new Error(error.message);
  },
};

/* --------------------------------------------------------------- factory */

/** Swap these to the real adapters when the keys are in place. */
export const smsProvider: SmsProvider = simulatedSmsProvider;
export const paymentProvider: PaymentProvider = simulatedPaymentProvider;
export const cardVerifier: CardVerifier = simulatedCardVerifier;
export const listingModerator: ListingModerator = simulatedListingModerator;
