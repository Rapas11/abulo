# Abulo

One wallet, four marketplaces: virtual numbers, accounts, gift cards and paid tasks.
Dark mode only, single accent `#FF7A00`, Android first then web — all from one code base.

## Layout

| Folder | What it is |
|---|---|
| `app/` | Expo (React Native) app — Android and web. Routes in `src/app/`, design tokens in `src/theme.ts`. |
| `design/` | HTML mockups of the five screens (v1 design reference). |
| `admin/` | Admin panel web app (Sprint 8). |
| `supabase/` | Database migrations and server functions (Sprint 1+). |

## Run the app

```sh
cd app
npm install
npx expo start          # scan the QR with Expo Go on Android
npx expo start --web    # or open it in the browser
```

To preview a production build locally:

```sh
cd app
npx expo export -p web  # static build into dist/
node scripts/serve-dist.mjs   # serves dist/ at http://localhost:4173
```

## Backend (Supabase)

The app is wired to the real Supabase project:

- URL: `https://wullpbyxutarkrmapxzx.supabase.co`
- Publishable key is in `app/src/lib/supabase.ts` (safe to ship; override with
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if needed).

One-time setup (the publishable key cannot create tables by itself):

1. Open **Supabase → SQL Editor**, paste `supabase/schema.sql`, and click **Run**.
2. Open **Authentication → Sign In / Providers → Email** and turn **off**
   “Confirm email” while testing. This makes a new account sign in immediately.
   If you want the in-app 6-digit confirmation screen instead, keep it on and add
   `{{ .Token }}` to the “Confirm signup” email template.
3. Password reset by code needs `{{ .Token }}` in the “Reset password” template.
   The Supabase default email only contains a link.

What is real now:

- Accounts, sessions and profiles (Supabase Auth + `profiles`).
- Wallet ledger, deposits/withdrawals, numbers, tasks, gift cards, listing
  purchases, seller payouts and the admin panel — all data lives in Postgres.
- All money rules run in SQL functions; the app cannot write balances directly.

Still simulated until provider keys arrive:

- Paystack deposits/withdrawals (`deposit_demo`, `withdraw_money` move ledger
  money, no real bank transfer).
- 5sim SMS delivery (~9 seconds).
- Gift-card verification (auto-approved after 20 seconds) and listing review
  (auto-approved after 25 seconds). Both are controlled by `settings.demo_mode`.

## Trying the app

Create an account with any email you can open. The first account becomes the
admin, so the “Admin panel” entry appears under Profile. Use the Deposit button
to add demo funds before buying numbers, gift cards, accounts or posting tasks.

By design, reopening the app asks for your 6-digit PIN. The PIN is a local
device lock stored hashed in AsyncStorage; the account itself is in Supabase.

## Known issues

- Web (static build): a hydration console warning fires once on load (`Minified React error #418`).
  The page redraws itself in milliseconds and is unaffected, and Android has no hydration at all.
  Revisit when polishing the web version.

## Sprint progress

- [x] Sprint 0 — foundation: repo, theme tokens, five-tab shell, empty states
- [x] Sprint 1 — auth: sign up, email verify, PIN setup/unlock, reset password, profile
- [x] Sprint 2 — wallet + deposits (ledger, server-side money rules, demo Paystack)
- [x] Sprint 3 — withdrawals (bank, fees, limits, confirm sheet)
- [x] Sprint 4 — numbers (catalog, buy flow, code inbox, auto refund)
- [x] Sprint 5 — tasks (create, proof, review, rewards)
- [x] Sprint 6 — gift cards (rates, submit, review, payout)
- [x] Sprint 7 — accounts marketplace (listings, buy, seller payout, purchases)
- [x] Sprint 8 — admin panel (tasks, approvals, orders, settings)
- [ ] Sprint 9 — web export + Android release + real Paystack/5sim keys

Rules that never change: money moves only on the server, the balance is the sum of the
ledger, and every spend ends with a confirm sheet that repeats the amount.
