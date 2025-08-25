-- CleanNami Database Schema

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table  
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  city TEXT CHECK (city IN ('New Smyrna Beach','Daytona Beach','Edgewater')),
  address1 TEXT NOT NULL,
  address2 TEXT,
  zipcode TEXT,
  beds INTEGER NOT NULL,
  baths INTEGER NOT NULL,
  sqft INTEGER,
  is_vr BOOLEAN DEFAULT FALSE,
  ical_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  months INTEGER CHECK (months BETWEEN 1 AND 6),
  type TEXT CHECK (type IN ('Residential','VR')),
  start_limit DATE DEFAULT '2025-09-21',
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contractors table
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  city TEXT CHECK (city IN ('New Smyrna Beach','Daytona Beach','Edgewater')),
  stripe_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  city TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Claimed', 'In Progress', 'Submitted', 'Approved', 'Paid', 'Cancelled')),
  price_cents INTEGER NOT NULL,
  payout_cents INTEGER NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id),
  is_first_clean BOOLEAN DEFAULT FALSE,
  ics_uid TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment events table
CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'transfer', 'refund', 'dispute')),
  amount_cents INTEGER NOT NULL,
  stripe_pi_id TEXT,
  stripe_tr_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  attempt_no INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Magic links table for customer authentication
CREATE TABLE public.magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractors (can view jobs in their city and their own data)
CREATE POLICY "contractors_select_own_data" ON public.contractors
  FOR SELECT USING (id = auth.uid()::uuid);

CREATE POLICY "contractors_update_own_data" ON public.contractors
  FOR UPDATE USING (id = auth.uid()::uuid);

-- Jobs policies - contractors can see jobs in their city
CREATE POLICY "contractors_select_jobs" ON public.jobs
  FOR SELECT USING (
    city IN (SELECT city FROM public.contractors WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "contractors_update_claimed_jobs" ON public.jobs
  FOR UPDATE USING (contractor_id = auth.uid()::uuid);

-- Admin policies - full access
CREATE POLICY "admin_full_access_customers" ON public.customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "admin_full_access_properties" ON public.properties
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "admin_full_access_subscriptions" ON public.subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "admin_full_access_jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "admin_full_access_payment_events" ON public.payment_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()::uuid)
  );

CREATE POLICY "admin_select_own_data" ON public.admin_users
  FOR SELECT USING (id = auth.uid()::uuid);

-- Service role policies for API operations
CREATE POLICY "service_role_full_access_customers" ON public.customers
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_full_access_properties" ON public.properties
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_full_access_subscriptions" ON public.subscriptions
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_full_access_jobs" ON public.jobs
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_full_access_payment_events" ON public.payment_events
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_full_access_magic_links" ON public.magic_links
  FOR ALL USING (current_setting('role') = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_properties_customer_id ON public.properties(customer_id);
CREATE INDEX idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_property_id ON public.subscriptions(property_id);
CREATE INDEX idx_jobs_property_id ON public.jobs(property_id);
CREATE INDEX idx_jobs_subscription_id ON public.jobs(subscription_id);
CREATE INDEX idx_jobs_contractor_id ON public.jobs(contractor_id);
CREATE INDEX idx_jobs_date ON public.jobs(date);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_city ON public.jobs(city);
CREATE INDEX idx_payment_events_job_id ON public.payment_events(job_id);
CREATE INDEX idx_payment_events_subscription_id ON public.payment_events(subscription_id);
CREATE INDEX idx_magic_links_token ON public.magic_links(token);
CREATE INDEX idx_magic_links_email ON public.magic_links(email);

-- Function to calculate cleaning price
CREATE OR REPLACE FUNCTION public.calculate_price(beds INTEGER, baths INTEGER, sqft INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_price INTEGER := 100;
  price INTEGER := 0;
  sqft_surcharge INTEGER := 0;
BEGIN
  -- Handle custom quote case
  IF sqft >= 3000 THEN
    RETURN -1; -- Indicates custom quote required
  END IF;

  -- Base pricing grid
  IF beds = 1 THEN
    CASE baths
      WHEN 1 THEN price := 100;
      WHEN 2 THEN price := 120;
      WHEN 3 THEN price := 140;
      WHEN 4 THEN price := 160;
      WHEN 5 THEN price := 180;
      ELSE price := 100 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 2 THEN
    CASE baths
      WHEN 1 THEN price := 130;
      WHEN 2 THEN price := 150;
      WHEN 3 THEN price := 170;
      WHEN 4 THEN price := 190;
      WHEN 5 THEN price := 210;
      ELSE price := 130 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 3 THEN
    CASE baths
      WHEN 1 THEN price := 160;
      WHEN 2 THEN price := 180;
      WHEN 3 THEN price := 200;
      WHEN 4 THEN price := 220;
      WHEN 5 THEN price := 240;
      ELSE price := 160 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 4 THEN
    CASE baths
      WHEN 1 THEN price := 190;
      WHEN 2 THEN price := 210;
      WHEN 3 THEN price := 230;
      WHEN 4 THEN price := 250;
      WHEN 5 THEN price := 270;
      ELSE price := 190 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 5 THEN
    CASE baths
      WHEN 1 THEN price := 220;
      WHEN 2 THEN price := 240;
      WHEN 3 THEN price := 260;
      WHEN 4 THEN price := 280;
      WHEN 5 THEN price := 300;
      ELSE price := 220 + (baths - 1) * 20;
    END CASE;
  ELSE
    -- Fallback calculation for 6+ bedrooms
    price := 100 + (beds - 1) * 30 + (baths - 1) * 20;
  END IF;

  -- Square footage surcharge
  IF sqft >= 1000 AND sqft < 1500 THEN
    sqft_surcharge := 25;
  ELSIF sqft >= 1500 AND sqft < 2000 THEN
    sqft_surcharge := 50;
  ELSIF sqft >= 2000 AND sqft < 2500 THEN
    sqft_surcharge := 75;
  ELSIF sqft >= 2500 AND sqft < 3000 THEN
    sqft_surcharge := 100;
  END IF;

  RETURN price + sqft_surcharge;
END;
$$;

-- Function to calculate contractor payout (70% with $60 minimum)
CREATE OR REPLACE FUNCTION public.calculate_payout(price_cents INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  payout_cents INTEGER;
BEGIN
  payout_cents := ROUND(price_cents * 0.70);
  
  -- Minimum payout is $60
  IF payout_cents < 6000 THEN
    payout_cents := 6000;
  END IF;
  
  RETURN payout_cents;
END;
$$;