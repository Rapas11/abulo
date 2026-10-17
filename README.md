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

## Known issues

- Web (static build): a hydration console warning fires once on load (`Minified React error #418`).
  The page redraws itself in milliseconds and is unaffected, and Android has no hydration at all.
  Revisit when polishing the web version.

## Sprint progress

- [x] Sprint 0 — foundation: repo, theme tokens, five-tab shell, empty states
- [ ] Sprint 1 — auth: email + password, profile, 6-digit PIN
- [ ] Sprint 2 — wallet + deposits (Paystack, ledger, server-side money rules)
- [ ] Sprint 3 — withdrawals (bank, name check, fees, limits)
- [ ] Sprint 4 — numbers (5sim adapter, buy flow, code inbox, auto refund)
- [ ] Sprint 5 — tasks (create, proof upload, review, rewards)
- [ ] Sprint 6 — gift cards (rates, submit, review, holds)
- [ ] Sprint 7 — accounts marketplace (sellers, listings, escrow, disputes)
- [ ] Sprint 8 — admin panel
- [ ] Sprint 9 — web export + Android release

Rules that never change: money moves only on the server, the balance is the sum of the
ledger, and every spend ends with a confirm sheet that repeats the amount.
