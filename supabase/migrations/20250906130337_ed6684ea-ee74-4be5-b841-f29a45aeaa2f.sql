-- A) Normalized city columns (if not present)
alter table public.contractors
  add column if not exists city_norm text generated always as (lower(trim(city))) stored;
alter table public.jobs
  add column if not exists city_norm text generated always as (lower(trim(city))) stored;

create index if not exists idx_contractors_city_norm on public.contractors(city_norm);
create index if not exists idx_jobs_city_norm on public.jobs(city_norm);
create index if not exists idx_jobs_status on public.jobs(status);

-- B) Job status constraint
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name='jobs' and constraint_name='jobs_status_check'
  ) then
    alter table public.jobs add constraint jobs_status_check
    check (status in ('New','Claimed','Assigned','InProgress','Submitted','Completed','Approved','Paid','Cancelled','Rejected'));
  end if;
end $$;

-- C) RLS for jobs (contractors see only New jobs in their city)
drop policy if exists "contractors_see_available" on public.jobs;
create policy "contractors_see_available" on public.jobs
  for select using (
    status = 'New'
    and exists (
      select 1 from public.contractors c
      where c.user_id = auth.uid()
        and c.city_norm = jobs.city_norm
    )
  );

-- D) Payments revenue table (customer_payments) if missing
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  customer_email text not null,
  customer_name text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  payment_method text,
  payment_status text not null default 'pending', -- pending|completed|failed|refunded
  payment_type text not null,                     -- initial|recurring
  stripe_fee_cents integer default 0,
  net_amount_cents integer not null,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_payments enable row level security;
drop policy if exists "admins_full_access_customer_payments" on public.customer_payments;
create policy "admins_full_access_customer_payments" on public.customer_payments
  for all using (public.is_admin());
drop policy if exists "service_role_full_access_customer_payments" on public.customer_payments;
create policy "service_role_full_access_customer_payments" on public.customer_payments
  for all using (current_setting('role', true) = 'service_role');

create index if not exists idx_customer_payments_booking_id on public.customer_payments(booking_id);
create index if not exists idx_customer_payments_job_id on public.customer_payments(job_id);
create index if not exists idx_customer_payments_status on public.customer_payments(payment_status);

-- E) Contractor payouts table + trigger
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'pending', -- pending|approved|paid|rejected
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, contractor_id)
);

alter table public.payment_requests enable row level security;

drop policy if exists "admins_full_access_payment_requests" on public.payment_requests;
create policy "admins_full_access_payment_requests" on public.payment_requests
  for all using (public.is_admin());
drop policy if exists "service_role_full_access_payment_requests" on public.payment_requests;
create policy "service_role_full_access_payment_requests" on public.payment_requests
  for all using (current_setting('role', true) = 'service_role');
drop policy if exists "contractors_view_own_payment_requests" on public.payment_requests;
create policy "contractors_view_own_payment_requests" on public.payment_requests
  for select using (
    contractor_id in (select id from public.contractors where user_id = auth.uid())
  );
drop policy if exists "contractors_insert_own_payment_requests" on public.payment_requests;
create policy "contractors_insert_own_payment_requests" on public.payment_requests
  for insert with check (
    contractor_id in (select id from public.contractors where user_id = auth.uid())
  );

create or replace function public.on_job_for_payout()
returns trigger as $$
begin
  if (new.status in ('Submitted','Completed','Approved'))
     and (coalesce(new.contractor_id, new.claimed_by) is not null) then
    insert into public.payment_requests(job_id, contractor_id, amount_cents)
    values (new.id, coalesce(new.contractor_id, new.claimed_by), coalesce(new.payout_cents, 0))
    on conflict (job_id, contractor_id) do nothing;
  end if;
  return new;
end; $$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_job_for_payout on public.jobs;
create trigger trg_job_for_payout
after update on public.jobs
for each row
when (old.status is distinct from new.status)
execute function public.on_job_for_payout();

-- F) Customers table (backfill from bookings)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  phone text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.customers(email, name, phone, stripe_customer_id)
select distinct b.customer_email, b.customer_name, b.customer_phone, b.stripe_customer_id
from public.bookings b
where b.customer_email is not null
on conflict (email) do update
  set name = excluded.name,
      phone = excluded.phone,
      stripe_customer_id = coalesce(excluded.stripe_customer_id, public.customers.stripe_customer_id);

-- G) Subscriptions table (we charge per job, but track local subscription info)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  customer_email text not null,
  frequency text not null,      -- weekly|bi-weekly|tri-weekly|monthly
  months integer not null,
  status text not null default 'active', -- active|canceled|completed
  start_date date not null default current_date,
  end_date date,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscriptions(booking_id, customer_email, frequency, months, status, stripe_customer_id)
select b.id, b.customer_email, b.frequency, coalesce(b.subscription_months, 1), 'active', b.stripe_customer_id
from public.bookings b
where b.payment_mode = 'subscription'
on conflict do nothing;

-- H) Payment events audit table + indexes
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  stripe_object_id text,
  booking_id uuid references public.bookings(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_events_event_type on public.payment_events(event_type);
create index if not exists idx_payment_events_object_id on public.payment_events(stripe_object_id);

alter table public.payment_events enable row level security;
drop policy if exists "admins_full_access_payment_events" on public.payment_events;
create policy "admins_full_access_payment_events" on public.payment_events
  for all using (public.is_admin());
drop policy if exists "service_role_full_access_payment_events" on public.payment_events;
create policy "service_role_full_access_payment_events" on public.payment_events
  for all using (current_setting('role', true) = 'service_role');

-- I) Bookings payment_mode column if missing
alter table public.bookings
  add column if not exists payment_mode text default 'subscription'; -- 'one-time' | 'subscription'
create index if not exists idx_bookings_payment_mode on public.bookings(payment_mode);