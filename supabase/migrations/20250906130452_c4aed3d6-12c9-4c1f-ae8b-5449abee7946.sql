-- Add missing columns and create tables only
alter table public.customers 
  add column if not exists stripe_customer_id text;

-- Add payment_mode to bookings if missing
alter table public.bookings
  add column if not exists payment_mode text default 'subscription';

-- Create subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  customer_email text not null,
  frequency text not null,
  months integer not null,
  status text not null default 'active',
  start_date date not null default current_date,
  end_date date,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create payment_events table
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  stripe_object_id text,
  booking_id uuid references public.bookings(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Add indexes
create index if not exists idx_bookings_payment_mode on public.bookings(payment_mode);
create index if not exists idx_payment_events_event_type on public.payment_events(event_type);
create index if not exists idx_payment_events_object_id on public.payment_events(stripe_object_id);

-- Enable RLS on payment_events
alter table public.payment_events enable row level security;
create policy "admins_full_access_payment_events" on public.payment_events
  for all using (public.is_admin());
create policy "service_role_full_access_payment_events" on public.payment_events
  for all using (current_setting('role', true) = 'service_role');