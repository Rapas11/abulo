-- ============================================================================
-- Abulo — "make it real" migration
-- Date: 2026-10-22
--
-- Adds:
--   1. public.notifications  — real, DB-backed notifications (the bell)
--   2. public.notify(...) / notify_admins(...) / mark_notifications_read()
--   3. public.quote_number_price() / quote_gift_card_payout() — server quotes
--   4. demo_mode switch on admin_update_settings (and the missing guard on
--      simulate_sms)
--   5. public.auth_codes + request_reset_code() / reset_password_with_code()
--      so password reset works without SMTP (demo) and can use email later
--
-- Idempotent: safe to run more than once.
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  amount_kobo bigint,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_time_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.notifications to authenticated;
revoke insert, update, delete on public.notifications from anon, authenticated;

-- Writes one notification for one user.
create or replace function public.notify(
  p_user uuid,
  p_kind text,
  p_title text,
  p_body text default '',
  p_link text default '',
  p_amount_kobo bigint default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;

  insert into public.notifications (user_id, kind, title, body, link, amount_kobo)
  values (p_user, p_kind, p_title, coalesce(p_body, ''), coalesce(p_link, ''), p_amount_kobo);
end;
$$;

-- Writes one notification for every admin (new work waiting for review).
create or replace function public.notify_admins(
  p_kind text,
  p_title text,
  p_body text default '',
  p_link text default ''
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_admin record;
begin
  for v_admin in select id from public.profiles where role = 'admin' loop
    perform public.notify(v_admin.id, p_kind, p_title, p_body, p_link, null);
  end loop;
end;
$$;

-- Marks every unread notification of the signed-in user as read.
create or replace function public.mark_notifications_read()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;

  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

-- ============================================================================
-- 2. SERVER QUOTES — the exact amount the server will charge
-- ============================================================================

create or replace function public.quote_number_price(p_country_code text, p_service_id text)
returns bigint
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_country public.number_countries%rowtype;
  v_service public.number_services%rowtype;
  v_markup int;
begin
  select * into v_country from public.number_countries where code = p_country_code;
  if not found then raise exception 'That number is not available.'; end if;
  select * into v_service from public.number_services where id = p_service_id;
  if not found then raise exception 'That service is not available.'; end if;

  select numbers_markup_pct into v_markup from public.settings where id;

  return (
    ceil((v_service.base_kobo * v_country.mult * (1 + coalesce(v_markup, 40) / 100.0)) / 100.0) * 100
  )::bigint;
end;
$$;

create or replace function public.quote_gift_card_payout(p_brand_id text, p_face_value_usd numeric)
returns bigint
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_brand public.gift_card_brands%rowtype;
begin
  select * into v_brand from public.gift_card_brands where id = p_brand_id;
  if not found then raise exception 'Unknown gift card brand.'; end if;

  return round(p_face_value_usd * v_brand.rate_ngn * 100)::bigint;
end;
$$;

-- ============================================================================
-- 3. SETTINGS — the demo-mode switch the app could never reach
-- ============================================================================

drop function if exists public.admin_update_settings(int, int, bigint);

create or replace function public.admin_update_settings(
  p_markup int,
  p_fee int,
  p_withdrawal_fee_kobo bigint,
  p_demo_mode boolean default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_markup < 0 or p_markup > 300 then raise exception 'Markup must be between 0 and 300%%.'; end if;
  if p_fee < 0 or p_fee > 50 then raise exception 'Fee must be between 0 and 50%%.'; end if;
  if p_withdrawal_fee_kobo < 0 or p_withdrawal_fee_kobo > 100000 then
    raise exception 'Withdrawal fee must be between ₦0 and ₦1,000.';
  end if;

  update public.settings
  set numbers_markup_pct = p_markup,
      account_fee_pct = p_fee,
      withdrawal_fee_kobo = p_withdrawal_fee_kobo,
      demo_mode = coalesce(p_demo_mode, demo_mode)
  where id;
end;
$$;

-- ============================================================================
-- 4. MONEY FUNCTIONS — notifications + the missing demo_mode guard
-- ============================================================================

-- Demo top-up. Paystack will replace this with a verified webhook.
create or replace function public.deposit_demo(p_amount_kobo bigint)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_demo boolean;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;
  select demo_mode into v_demo from public.settings where id;
  if not coalesce(v_demo, false) then raise exception 'Demo deposits are turned off.'; end if;
  if p_amount_kobo < 10000 then raise exception 'Minimum deposit is ₦100.'; end if;
  if p_amount_kobo > 100000000 then raise exception 'Maximum demo deposit is ₦1,000,000.'; end if;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (v_user, 'deposit', 'Deposit', 'Paystack demo payment', p_amount_kobo);

  perform public.notify(
    v_user, 'wallet', 'Deposit credited',
    '₦' || (p_amount_kobo / 100) || ' was added to your wallet.',
    '/wallet', p_amount_kobo
  );
end;
$$;

create or replace function public.withdraw_money(
  p_amount_kobo bigint,
  p_bank text,
  p_account_number text,
  p_account_name text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_fee bigint;
  v_total bigint;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;
  if p_amount_kobo < 100000 then raise exception 'Minimum withdrawal is ₦1,000.'; end if;
  if p_account_number !~ '^[0-9]{10}$' then raise exception 'Account number must be 10 digits.'; end if;
  if coalesce(trim(p_account_name), '') = '' then raise exception 'Enter the account name.'; end if;
  if coalesce(trim(p_bank), '') = '' then raise exception 'Choose a bank.'; end if;

  select withdrawal_fee_kobo into v_fee from public.settings where id;
  v_fee := coalesce(v_fee, 5000);
  v_total := p_amount_kobo + v_fee;

  if public.wallet_balance() < v_total then
    raise exception 'Not enough balance for this withdrawal plus the fee.';
  end if;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (
    v_user,
    'withdrawal',
    'Withdrawal',
    p_bank || ' · ' || right(p_account_number, 4) || ' · ₦' || (v_fee / 100) || ' fee',
    -v_total
  );

  perform public.notify(
    v_user, 'wallet', 'Withdrawal requested',
    '₦' || (p_amount_kobo / 100) || ' to ' || p_bank || ' · ' || right(p_account_number, 4),
    '/wallet', -v_total
  );
end;
$$;

create or replace function public.buy_number(p_country_code text, p_service_id text)
returns public.number_orders
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_country public.number_countries%rowtype;
  v_service public.number_services%rowtype;
  v_markup int;
  v_price bigint;
  v_name text;
  v_phone text;
  v_order public.number_orders%rowtype;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;

  select * into v_country from public.number_countries where code = p_country_code;
  if not found then raise exception 'That number is not available.'; end if;
  select * into v_service from public.number_services where id = p_service_id;
  if not found then raise exception 'That service is not available.'; end if;

  select numbers_markup_pct into v_markup from public.settings where id;
  v_price := (
    ceil((v_service.base_kobo * v_country.mult * (1 + coalesce(v_markup, 40) / 100.0)) / 100.0) * 100
  )::bigint;

  if public.wallet_balance() < v_price then
    raise exception 'Not enough balance. Deposit first.';
  end if;

  select name into v_name from public.profiles where id = v_user;
  v_phone := v_country.dial ||
    lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');

  insert into public.number_orders (
    user_id, user_name, country_code, country_name, service_id, service_name,
    price_kobo, phone_number
  )
  values (
    v_user, coalesce(v_name, 'User'), v_country.code, v_country.name,
    v_service.id, v_service.name, v_price, v_phone
  )
  returning * into v_order;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (
    v_user, 'number', v_service.name || ' number',
    v_country.name || ' · ' || v_phone, -v_price
  );

  perform public.notify(
    v_user, 'number', v_service.name || ' number bought',
    v_country.name || ' · ' || v_phone,
    '/numbers/order/' || v_order.id::text, -v_price
  );

  return v_order;
end;
$$;

-- Demo SMS delivery: the code arrives ~9 seconds after purchase.
-- Replace with the 5sim webhook when the provider is connected.
create or replace function public.simulate_sms(p_order_id uuid)
returns public.number_orders
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.number_orders%rowtype;
  v_code text;
  v_demo boolean;
begin
  select demo_mode into v_demo from public.settings where id;
  if not coalesce(v_demo, false) then raise exception 'Demo mode is off.'; end if;

  select * into v_order
  from public.number_orders
  where id = p_order_id and user_id = v_user
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if v_order.status = 'received' then return v_order; end if;
  if v_order.status <> 'waiting' then raise exception 'This order is closed.'; end if;
  if now() - v_order.created_at < interval '9 seconds' then return v_order; end if;

  v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  update public.number_orders
  set
    status = 'received',
    code = v_code,
    message = 'Your ' || v_order.service_name || ' verification code is ' || v_code ||
      '. Do not share it with anyone.',
    received_at = now()
  where id = p_order_id
  returning * into v_order;

  perform public.notify(
    v_user, 'number', 'Verification code received',
    v_order.service_name || ' · code ' || v_code,
    '/numbers/order/' || v_order.id::text, null
  );

  return v_order;
end;
$$;

create or replace function public.cancel_number(p_order_id uuid)
returns public.number_orders
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.number_orders%rowtype;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;

  select * into v_order
  from public.number_orders
  where id = p_order_id and user_id = v_user
  for update;

  if not found then raise exception 'Order not found.'; end if;
  if v_order.status <> 'waiting' then raise exception 'This order can no longer be cancelled.'; end if;

  update public.number_orders set status = 'cancelled' where id = p_order_id
  returning * into v_order;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (
    v_user, 'number_refund', 'Number refund',
    v_order.service_name || ' · ' || v_order.country_name, v_order.price_kobo
  );

  perform public.notify(
    v_user, 'number', 'Refund issued',
    v_order.service_name || ' number was refunded.',
    '/wallet', v_order.price_kobo
  );

  return v_order;
end;
$$;

-- --------------------------------------------------------------------- tasks
create or replace function public.submit_task(p_task_id uuid, p_note text)
returns public.submissions
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_name text;
  v_submission public.submissions%rowtype;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Add proof for your task.'; end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found.'; end if;
  if v_task.status <> 'open' then raise exception 'This task is closed.'; end if;
  if v_task.taken >= v_task.slots then raise exception 'All slots are taken.'; end if;

  if exists (
    select 1 from public.submissions
    where task_id = p_task_id and user_id = v_user and status in ('pending', 'approved')
  ) then
    raise exception 'You already submitted this task.';
  end if;

  select name into v_name from public.profiles where id = v_user;

  insert into public.submissions (task_id, task_title, user_id, user_name, note, reward_kobo)
  values (p_task_id, v_task.title, v_user, coalesce(v_name, 'User'), trim(p_note), v_task.reward_kobo)
  returning * into v_submission;

  update public.tasks set taken = taken + 1 where id = p_task_id;

  perform public.notify(
    v_user, 'task', 'Task submitted',
    v_task.title || ' · waiting for review.',
    '/tasks/' || p_task_id::text, null
  );
  perform public.notify_admins(
    'task', 'New task submission',
    coalesce(v_name, 'User') || ' submitted ' || v_task.title,
    '/admin/approvals'
  );

  return v_submission;
end;
$$;

create or replace function public.review_submission(p_submission_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_submission public.submissions%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'Submission not found.'; end if;
  if v_submission.status <> 'pending' then raise exception 'Already reviewed.'; end if;

  update public.submissions
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now()
  where id = p_submission_id;

  if p_approve then
    insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
    values (
      v_submission.user_id, 'task', 'Task reward', v_submission.task_title,
      v_submission.reward_kobo
    );
  else
    update public.tasks
    set taken = greatest(taken - 1, 0)
    where id = v_submission.task_id;
  end if;

  perform public.notify(
    v_submission.user_id, 'task',
    case when p_approve then 'Task approved' else 'Task rejected' end,
    v_submission.task_title,
    '/tasks/' || v_submission.task_id::text,
    case when p_approve then v_submission.reward_kobo else null end
  );
end;
$$;

-- ---------------------------------------------------------------- gift cards
create or replace function public.sell_gift_card(
  p_brand_id text,
  p_face_value_usd numeric,
  p_code text,
  p_pin text
)
returns public.gift_cards
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_brand public.gift_card_brands%rowtype;
  v_name text;
  v_order public.gift_cards%rowtype;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;

  select * into v_brand from public.gift_card_brands where id = p_brand_id;
  if not found then raise exception 'Unknown gift card brand.'; end if;
  if p_face_value_usd < 5 then raise exception 'Minimum card value is $5.'; end if;
  if p_face_value_usd > 1000 then raise exception 'Maximum card value is $1,000.'; end if;
  if length(coalesce(trim(p_code), '')) < 6 then raise exception 'Enter the full card code.'; end if;

  select name into v_name from public.profiles where id = v_user;

  insert into public.gift_cards (
    user_id, user_name, brand_id, brand_name, face_value_usd, payout_kobo, code, pin
  )
  values (
    v_user, coalesce(v_name, 'User'), v_brand.id, v_brand.name, p_face_value_usd,
    round(p_face_value_usd * v_brand.rate_ngn * 100)::bigint,
    trim(p_code), nullif(trim(p_pin), '')
  )
  returning * into v_order;

  perform public.notify(
    v_user, 'giftcard', 'Gift card submitted',
    v_brand.name || ' · $' || p_face_value_usd || ' · waiting for review.',
    '/earn?tab=giftcards', null
  );
  perform public.notify_admins(
    'giftcard', 'Gift card waiting for review',
    coalesce(v_name, 'User') || ' submitted a ' || v_brand.name || ' card.',
    '/admin/approvals'
  );

  return v_order;
end;
$$;

create or replace function public.review_gift_card(p_order_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.gift_cards%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;

  select * into v_order from public.gift_cards where id = p_order_id for update;
  if not found then raise exception 'Gift card not found.'; end if;
  if v_order.status <> 'pending' then raise exception 'Already reviewed.'; end if;

  update public.gift_cards
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now()
  where id = p_order_id;

  if p_approve then
    insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
    values (
      v_order.user_id, 'giftcard', v_order.brand_name || ' gift card',
      '$' || v_order.face_value_usd || ' · payout', v_order.payout_kobo
    );
  end if;

  perform public.notify(
    v_order.user_id, 'giftcard',
    case when p_approve then 'Gift card paid' else 'Gift card rejected' end,
    v_order.brand_name || ' · $' || v_order.face_value_usd,
    '/earn?tab=giftcards',
    case when p_approve then v_order.payout_kobo else null end
  );
end;
$$;

-- Demo verification: approve the user's own card after 20 seconds while
-- demo_mode is on. Turn demo_mode off to make cards admin-reviewed only.
create or replace function public.simulate_gift_card_review(p_order_id uuid)
returns public.gift_cards
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.gift_cards%rowtype;
  v_demo boolean;
begin
  select demo_mode into v_demo from public.settings where id;
  if not coalesce(v_demo, false) then raise exception 'Demo mode is off.'; end if;

  select * into v_order
  from public.gift_cards
  where id = p_order_id and user_id = v_user
  for update;

  if not found then raise exception 'Gift card not found.'; end if;
  if v_order.status <> 'pending' then return v_order; end if;
  if now() - v_order.created_at < interval '20 seconds' then return v_order; end if;

  update public.gift_cards
  set status = 'approved', reviewed_at = now()
  where id = p_order_id
  returning * into v_order;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (
    v_order.user_id, 'giftcard', v_order.brand_name || ' gift card',
    '$' || v_order.face_value_usd || ' · payout', v_order.payout_kobo
  );

  perform public.notify(
    v_order.user_id, 'giftcard', 'Gift card paid',
    v_order.brand_name || ' · $' || v_order.face_value_usd,
    '/earn?tab=giftcards', v_order.payout_kobo
  );

  return v_order;
end;
$$;

-- ----------------------------------------------------------------- accounts
create or replace function public.create_listing(
  p_platform text,
  p_title text,
  p_description text,
  p_price_kobo bigint
)
returns public.listings
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_listing public.listings%rowtype;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Give the account a title.'; end if;
  if coalesce(trim(p_description), '') = '' then raise exception 'Describe the account.'; end if;
  if p_price_kobo < 100000 then raise exception 'Minimum price is ₦1,000.'; end if;
  if p_price_kobo > 100000000 then raise exception 'Maximum price is ₦1,000,000.'; end if;

  select name into v_name from public.profiles where id = v_user;

  insert into public.listings (seller_id, seller_name, platform, title, description, price_kobo)
  values (
    v_user, coalesce(v_name, 'User'), p_platform, trim(p_title),
    trim(p_description), p_price_kobo
  )
  returning * into v_listing;

  perform public.notify(
    v_user, 'account', 'Listing submitted',
    p_title || ' · waiting for review.',
    '/market/listing/' || v_listing.id::text, null
  );
  perform public.notify_admins(
    'account', 'Listing waiting for review',
    coalesce(v_name, 'User') || ' posted ' || p_title,
    '/admin/approvals'
  );

  return v_listing;
end;
$$;

create or replace function public.admin_review_listing(p_listing_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then raise exception 'Listing not found.'; end if;
  if v_listing.status <> 'pending' then raise exception 'Already reviewed.'; end if;

  update public.listings
  set status = case when p_approve then 'active' else 'rejected' end
  where id = p_listing_id;

  perform public.notify(
    v_listing.seller_id, 'account',
    case when p_approve then 'Listing is live' else 'Listing rejected' end,
    v_listing.title,
    '/market/listing/' || v_listing.id::text, null
  );
end;
$$;

-- Demo review: listings go live after 25 seconds while demo_mode is on.
create or replace function public.simulate_listing_review(p_listing_id uuid)
returns public.listings
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_demo boolean;
begin
  select demo_mode into v_demo from public.settings where id;
  if not coalesce(v_demo, false) then raise exception 'Demo mode is off.'; end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id and seller_id = v_user
  for update;

  if not found then raise exception 'Listing not found.'; end if;
  if v_listing.status <> 'pending' then return v_listing; end if;
  if now() - v_listing.created_at < interval '25 seconds' then return v_listing; end if;

  update public.listings set status = 'active' where id = p_listing_id
  returning * into v_listing;

  perform public.notify(
    v_listing.seller_id, 'account', 'Listing is live',
    v_listing.title,
    '/market/listing/' || v_listing.id::text, null
  );

  return v_listing;
end;
$$;

create or replace function public.buy_listing(p_listing_id uuid)
returns public.listings
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_listing public.listings%rowtype;
  v_fee int;
  v_seller_kobo bigint;
  v_credentials text;
begin
  if v_user is null then raise exception 'Please sign in.'; end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then raise exception 'Listing not found.'; end if;
  if v_listing.status <> 'active' then raise exception 'This account is no longer available.'; end if;
  if v_listing.seller_id = v_user then raise exception 'This is your own listing.'; end if;
  if public.wallet_balance() < v_listing.price_kobo then
    raise exception 'Not enough balance. Deposit first.';
  end if;

  select account_fee_pct into v_fee from public.settings where id;
  v_fee := coalesce(v_fee, 7);
  v_seller_kobo := (v_listing.price_kobo * (100 - v_fee) / 100)::bigint;

  v_credentials :=
    'Email: ' || v_listing.platform || '_' ||
    substr(md5(random()::text), 1, 4) || '@mail.abulo.app' ||
    E'\nPassword: Abulo#' || lpad((floor(random() * 1000000))::int::text, 6, '0');

  select name into v_name from public.profiles where id = v_user;

  update public.listings
  set status = 'sold',
      buyer_id = v_user,
      buyer_name = coalesce(v_name, 'User'),
      credentials = v_credentials,
      sold_at = now()
  where id = p_listing_id
  returning * into v_listing;

  insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
  values (v_user, 'account_buy', 'Account purchase', v_listing.title, -v_listing.price_kobo);

  if v_listing.seller_id is not null then
    insert into public.ledger_entries (user_id, kind, title, subtitle, amount_kobo)
    values (
      v_listing.seller_id, 'account_sale', 'Account sale',
      v_listing.title || ' · ' || v_fee || '% fee', v_seller_kobo
    );

    perform public.notify(
      v_listing.seller_id, 'account', 'Your account was sold',
      v_listing.title || ' · ' || v_fee || '% fee',
      '/market/listing/' || v_listing.id::text, v_seller_kobo
    );
  end if;

  perform public.notify(
    v_user, 'account', 'Account purchased',
    v_listing.title,
    '/market/listing/' || v_listing.id::text, -v_listing.price_kobo
  );

  return v_listing;
end;
$$;

-- ============================================================================
-- 5. EMAIL CODES — signup confirmation and password reset without SMTP
-- ============================================================================

create table if not exists public.auth_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text not null default 'reset',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_codes_lookup_idx
  on public.auth_codes (email, purpose, created_at desc);

alter table public.auth_codes enable row level security;
revoke all on public.auth_codes from anon, authenticated;

-- Creates a reset code. In demo mode the code is returned so the app can show
-- it on screen; later, swap this for an email sender and return ''.
create or replace function public.request_reset_code(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_demo boolean;
  v_code text;
begin
  if v_email = '' then return ''; end if;

  select demo_mode into v_demo from public.settings where id;

  if not exists (select 1 from auth.users where email = v_email) then
    return '';
  end if;

  v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.auth_codes (email, code, purpose, expires_at)
  values (v_email, v_code, 'reset', now() + interval '15 minutes');

  if coalesce(v_demo, false) then return v_code; end if;
  return '';
end;
$$;

-- Checks a reset code and sets the new password. Sessions are killed so every
-- device has to sign in with the new password.
create or replace function public.reset_password_with_code(
  p_email text,
  p_code text,
  p_new_password text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_row public.auth_codes%rowtype;
begin
  if v_email = '' or coalesce(trim(p_code), '') = '' then
    raise exception 'Enter the code we sent you.';
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then raise exception 'No account with that email.'; end if;

  select * into v_row
  from public.auth_codes
  where email = v_email and purpose = 'reset' and used_at is null and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then raise exception 'That code has expired. Request a new one.'; end if;
  if v_row.code <> trim(p_code) then raise exception 'That code is not correct.'; end if;

  update public.auth_codes set used_at = now() where id = v_row.id;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  where id = v_user_id;

  delete from auth.sessions where user_id = v_user_id;

  return true;
end;
$$;

-- Creates a signup confirmation code. In demo mode the code is returned so the
-- app can show it on screen; later an email sender takes over.
create or replace function public.request_signup_code(p_email text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_demo boolean;
  v_code text;
begin
  if v_email = '' then return ''; end if;

  select demo_mode into v_demo from public.settings where id;

  if not exists (select 1 from auth.users where email = v_email) then
    return '';
  end if;

  v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');

  insert into public.auth_codes (email, code, purpose, expires_at)
  values (v_email, v_code, 'signup', now() + interval '60 minutes');

  if coalesce(v_demo, false) then return v_code; end if;
  return '';
end;
$$;

-- Confirms an email address with the code from request_signup_code.
create or replace function public.confirm_signup(p_email text, p_code text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user_id uuid;
  v_row public.auth_codes%rowtype;
begin
  if v_email = '' or coalesce(trim(p_code), '') = '' then
    raise exception 'Enter the code we sent you.';
  end if;

  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then raise exception 'No account with that email.'; end if;

  select * into v_row
  from public.auth_codes
  where email = v_email and purpose = 'signup' and used_at is null and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then raise exception 'That code has expired. Request a new one.'; end if;
  if v_row.code <> trim(p_code) then raise exception 'That code is not correct.'; end if;

  update public.auth_codes set used_at = now() where id = v_row.id;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = v_user_id;

  return true;
end;
$$;

-- ============================================================================
-- Done. The app picks all of this up automatically.
-- ============================================================================
