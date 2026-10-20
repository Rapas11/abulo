-- ============================================================================
-- ABULO — REAL SUPABASE SCHEMA
-- Paste this entire file into Supabase → SQL Editor → Run.
-- Safe to run more than once: it only creates/updates, never drops data.
-- ============================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- Create a profile automatically for every new auth user. The first profile
-- becomes the admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    case when not exists (select 1 from public.profiles) then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If accounts already exist, backfill them and make sure there is an admin.
insert into public.profiles (id, name)
select id, coalesce(nullif(raw_user_meta_data ->> 'name', ''), split_part(coalesce(email, 'user'), '@', 1))
from auth.users
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where id = (select id from public.profiles order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where role = 'admin');

-- ------------------------------------------------------------------ settings
create table if not exists public.settings (
  id boolean primary key default true check (id),
  numbers_markup_pct int not null default 40,
  account_fee_pct int not null default 7,
  withdrawal_fee_kobo bigint not null default 5000,
  demo_mode boolean not null default true
);
insert into public.settings (id) values (true) on conflict (id) do nothing;

-- -------------------------------------------------------------------- wallet
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  subtitle text not null default '',
  amount_kobo bigint not null,
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists ledger_entries_user_time_idx
  on public.ledger_entries (user_id, created_at desc);

-- ------------------------------------------------------------- number catalog
create table if not exists public.number_countries (
  code text primary key,
  name text not null,
  dial text not null,
  flag text not null,
  mult numeric(6, 3) not null
);

create table if not exists public.number_services (
  id text primary key,
  name text not null,
  icon text not null,
  base_kobo bigint not null
);

insert into public.number_countries (code, name, dial, flag, mult) values
  ('ng', 'Nigeria', '+234', '🇳🇬', 1),
  ('us', 'USA', '+1', '🇺🇸', 1.6),
  ('gb', 'UK', '+44', '🇬🇧', 1.7),
  ('gh', 'Ghana', '+233', '🇬🇭', 0.8),
  ('ke', 'Kenya', '+254', '🇰🇪', 0.85),
  ('in', 'India', '+91', '🇮🇳', 0.6),
  ('de', 'Germany', '+49', '🇩🇪', 1.8),
  ('ca', 'Canada', '+1', '🇨🇦', 1.55)
on conflict (code) do nothing;

insert into public.number_services (id, name, icon, base_kobo) values
  ('whatsapp', 'WhatsApp', 'logo-whatsapp', 80000),
  ('telegram', 'Telegram', 'paper-plane-outline', 50000),
  ('tiktok', 'TikTok', 'musical-notes-outline', 70000),
  ('instagram', 'Instagram', 'logo-instagram', 90000),
  ('google', 'Google', 'logo-google', 60000),
  ('facebook', 'Facebook', 'logo-facebook', 50000),
  ('x', 'X (Twitter)', 'logo-twitter', 40000),
  ('discord', 'Discord', 'logo-discord', 65000),
  ('tinder', 'Tinder', 'flame-outline', 55000),
  ('uber', 'Uber', 'car-outline', 70000),
  ('snapchat', 'Snapchat', 'logo-snapchat', 75000),
  ('signal', 'Signal', 'chatbubble-ellipses-outline', 60000)
on conflict (id) do nothing;

create table if not exists public.number_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  country_code text not null,
  country_name text not null,
  service_id text not null,
  service_name text not null,
  price_kobo bigint not null,
  phone_number text not null,
  status text not null default 'waiting' check (status in ('waiting', 'received', 'cancelled')),
  code text,
  message text,
  created_at timestamptz not null default now(),
  received_at timestamptz
);
create index if not exists number_orders_user_time_idx
  on public.number_orders (user_id, created_at desc);

-- --------------------------------------------------------------------- tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  reward_kobo bigint not null check (reward_kobo > 0),
  slots int not null check (slots > 0),
  taken int not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  created_by text not null default 'abulo'
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  task_title text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  note text not null,
  reward_kobo bigint not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

insert into public.tasks (id, title, description, reward_kobo, slots, taken, status, created_by, created_at) values
  ('11111111-1111-4111-8111-111111111101', 'Follow Abulo on Instagram',
   'Follow @abulo.app on Instagram, then paste your Instagram username as proof.',
   30000, 100, 0, 'open', 'abulo', now() - interval '1 hour'),
  ('11111111-1111-4111-8111-111111111102', 'Join the Abulo Telegram group',
   'Join t.me/abulo, stay for at least 24 hours and paste your Telegram username.',
   20000, 200, 0, 'open', 'abulo', now() - interval '2 hours'),
  ('11111111-1111-4111-8111-111111111103', 'Post about Abulo on X',
   'Write a short honest review of Abulo on X, mention @abulo, and paste the post link.',
   50000, 50, 0, 'open', 'abulo', now() - interval '3 hours')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- gift cards
create table if not exists public.gift_card_brands (
  id text primary key,
  name text not null,
  icon text not null,
  rate_ngn int not null
);

insert into public.gift_card_brands (id, name, icon, rate_ngn) values
  ('amazon', 'Amazon', 'cart-outline', 1500),
  ('apple', 'Apple / iTunes', 'logo-apple', 1550),
  ('steam', 'Steam', 'game-controller-outline', 1600),
  ('googleplay', 'Google Play', 'logo-google', 1450),
  ('razer', 'Razer Gold', 'flash-outline', 1500),
  ('walmart', 'Walmart', 'storefront-outline', 1400),
  ('sephora', 'Sephora', 'sparkles-outline', 1450),
  ('ebay', 'eBay', 'pricetag-outline', 1420)
on conflict (id) do nothing;

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  brand_id text not null,
  brand_name text not null,
  face_value_usd numeric(10, 2) not null check (face_value_usd >= 5),
  payout_kobo bigint not null,
  code text not null,
  pin text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ----------------------------------------------------------------- accounts
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text not null,
  platform text not null,
  title text not null,
  description text not null,
  price_kobo bigint not null check (price_kobo > 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'sold', 'rejected')),
  buyer_id uuid references public.profiles(id) on delete set null,
  buyer_name text,
  credentials text,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create index if not exists listings_status_time_idx
  on public.listings (status, created_at desc);

insert into public.listings (id, seller_id, seller_name, platform, title, description, price_kobo, status, created_at) values
  ('22222222-2222-4222-8222-222222222201', null, 'Abulo Verified', 'instagram',
   'Instagram — 8.5k followers',
   '2019 account, real-looking followers, email login included. No bans, no recovery. Perfect for a business page.',
   1800000, 'active', now() - interval '2 hours'),
  ('22222222-2222-4222-8222-222222222202', null, 'Abulo Verified', 'tiktok',
   'TikTok — 22k followers',
   'Nigerian audience, eligible for Creator Rewards, email + phone access included.',
   2500000, 'active', now() - interval '5 hours'),
  ('22222222-2222-4222-8222-222222222203', null, 'Abulo Verified', 'x',
   'X (Twitter) — 2015 aged',
   'Old 2015 account with 3.2k followers. Good for crypto or tech projects.',
   1200000, 'active', now() - interval '8 hours'),
  ('22222222-2222-4222-8222-222222222204', null, 'Abulo Verified', 'netflix',
   'Netflix Premium — 1 month',
   'Fresh premium plan, 4K, works on TV and phone. Login details sent instantly after purchase.',
   450000, 'active', now() - interval '1 hour'),
  ('22222222-2222-4222-8222-222222222205', null, 'Abulo Verified', 'facebook',
   'Facebook — Verified Business Manager',
   'Verified business manager with 2 ad accounts. Full ownership transfer, documents included.',
   3500000, 'active', now() - interval '12 hours'),
  ('22222222-2222-4222-8222-222222222206', null, 'Abulo Verified', 'discord',
   'Discord — 2017 account',
   'Old account in good standing. Can join any server and create your own immediately.',
   600000, 'active', now() - interval '20 hours'),
  ('22222222-2222-4222-8222-222222222207', null, 'Abulo Verified', 'spotify',
   'Spotify Premium — 3 months',
   'Three months of premium on your own email. Family slot, no interruptions.',
   500000, 'active', now() - interval '6 hours'),
  ('22222222-2222-4222-8222-222222222208', null, 'Abulo Verified', 'snapchat',
   'Snapchat — 5k score',
   '2018 account with a 5,000+ snap score. Email login included.',
   800000, 'active', now() - interval '30 hours')
on conflict (id) do nothing;

-- ============================================================================
-- SERVER-SIDE MONEY RULES
-- Only these functions can write the ledger. Screens never touch it directly.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.wallet_balance()
returns bigint
language sql stable security definer
set search_path = public
as $$
  select coalesce(sum(amount_kobo), 0)::bigint
  from public.ledger_entries
  where user_id = auth.uid() and status = 'completed';
$$;

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
begin
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

  return v_order;
end;
$$;

-- --------------------------------------------------------------------- tasks
create or replace function public.admin_create_task(
  p_title text,
  p_description text,
  p_reward_kobo bigint,
  p_slots int
)
returns public.tasks
language plpgsql security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_name text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Enter a task title.'; end if;
  if coalesce(trim(p_description), '') = '' then raise exception 'Enter the task instructions.'; end if;
  if p_reward_kobo < 100 then raise exception 'Reward must be at least ₦1.'; end if;
  if p_slots < 1 then raise exception 'Add at least one slot.'; end if;

  select name into v_name from public.profiles where id = auth.uid();

  insert into public.tasks (title, description, reward_kobo, slots, created_by)
  values (trim(p_title), trim(p_description), p_reward_kobo, p_slots, coalesce(v_name, 'Admin'))
  returning * into v_task;

  return v_task;
end;
$$;

create or replace function public.admin_set_task_status(p_task_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('open', 'closed') then raise exception 'Invalid status.'; end if;
  update public.tasks set status = p_status where id = p_task_id;
end;
$$;

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

  return v_listing;
end;
$$;

create or replace function public.admin_review_listing(p_listing_id uuid, p_approve boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if not exists (select 1 from public.listings where id = p_listing_id and status = 'pending') then
    raise exception 'Already reviewed.';
  end if;
  update public.listings
  set status = case when p_approve then 'active' else 'rejected' end
  where id = p_listing_id;
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
  end if;

  return v_listing;
end;
$$;

-- ------------------------------------------------------------------ profile
create or replace function public.update_my_name(p_name text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name cannot be empty.'; end if;
  update public.profiles set name = trim(p_name) where id = auth.uid();
end;
$$;

create or replace function public.admin_update_settings(
  p_markup int,
  p_fee int,
  p_withdrawal_fee_kobo bigint
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
      withdrawal_fee_kobo = p_withdrawal_fee_kobo
  where id;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Reads are scoped to the owner/admin. Writes happen through the functions
-- above only (direct table writes are revoked below).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.number_countries enable row level security;
alter table public.number_services enable row level security;
alter table public.number_orders enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.gift_card_brands enable row level security;
alter table public.gift_cards enable row level security;
alter table public.listings enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings
  for select to authenticated using (true);

drop policy if exists "read own ledger" on public.ledger_entries;
create policy "read own ledger" on public.ledger_entries
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "read catalog countries" on public.number_countries;
create policy "read catalog countries" on public.number_countries
  for select to authenticated using (true);

drop policy if exists "read catalog services" on public.number_services;
create policy "read catalog services" on public.number_services
  for select to authenticated using (true);

drop policy if exists "read number orders" on public.number_orders;
create policy "read number orders" on public.number_orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "read tasks" on public.tasks;
create policy "read tasks" on public.tasks
  for select to authenticated using (true);

drop policy if exists "read submissions" on public.submissions;
create policy "read submissions" on public.submissions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "read gift brands" on public.gift_card_brands;
create policy "read gift brands" on public.gift_card_brands
  for select to authenticated using (true);

drop policy if exists "read gift cards" on public.gift_cards;
create policy "read gift cards" on public.gift_cards
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "read listings" on public.listings;
create policy "read listings" on public.listings
  for select to authenticated using (
    status = 'active' or seller_id = auth.uid() or buyer_id = auth.uid() or public.is_admin()
  );

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.settings to authenticated;
grant select on public.ledger_entries to authenticated;
grant select on public.number_countries to authenticated;
grant select on public.number_services to authenticated;
grant select on public.number_orders to authenticated;
grant select on public.tasks to authenticated;
grant select on public.submissions to authenticated;
grant select on public.gift_card_brands to authenticated;
grant select on public.gift_cards to authenticated;
grant select on public.listings to authenticated;

revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.settings from anon, authenticated;
revoke insert, update, delete on public.ledger_entries from anon, authenticated;
revoke insert, update, delete on public.number_countries from anon, authenticated;
revoke insert, update, delete on public.number_services from anon, authenticated;
revoke insert, update, delete on public.number_orders from anon, authenticated;
revoke insert, update, delete on public.tasks from anon, authenticated;
revoke insert, update, delete on public.submissions from anon, authenticated;
revoke insert, update, delete on public.gift_card_brands from anon, authenticated;
revoke insert, update, delete on public.gift_cards from anon, authenticated;
revoke insert, update, delete on public.listings from anon, authenticated;

-- ============================================================================
-- DONE. Next: Authentication → Providers → Email → turn OFF "Confirm email"
-- while testing, so a new account signs in immediately.
-- ============================================================================
