-- =============================================================================
-- Cleanup for the temporary test account used during the end-to-end test.
--
-- Run this AFTER the test is finished (SQL Editor → Run). It removes the test
-- account from auth and every row it created: profile, ledger entries, number
-- orders, task submissions, gift cards, listings and notifications.
--
-- Safe to run twice.
-- =============================================================================

do $$
declare
  v_email text := 'abulo-test@abulo.app';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise notice 'No test account found (%). Nothing to do.', v_email;
    return;
  end if;

  -- Listings keep a null seller/buyer after the cascade (they record the
  -- marketplace sale), so remove them first. Purchases live on the same row.
  delete from public.listings
  where seller_id = v_user_id or buyer_id = v_user_id;

  -- Everything else cascades from profiles (ledger, orders, cards, tasks,
  -- submissions, notifications).
  delete from public.auth.users where id = v_user_id;

  raise notice 'Deleted test account % (all rows removed).', v_email;
end;
$$;
