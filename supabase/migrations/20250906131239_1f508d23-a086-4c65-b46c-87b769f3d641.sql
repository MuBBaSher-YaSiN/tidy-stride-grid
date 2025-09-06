-- Security fix for bookings table - prevent fake bookings and abuse
-- This migration adds comprehensive security measures while maintaining legitimate booking functionality

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "public_insert_bookings" ON public.bookings;

-- Create a rate limiting table to track booking attempts
CREATE TABLE IF NOT EXISTS public.booking_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identifier, identifier_type)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.booking_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage rate limits
CREATE POLICY "service_role_rate_limits" ON public.booking_rate_limits
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Add booking validation function
CREATE OR REPLACE FUNCTION public.validate_booking_data(
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_property_address TEXT,
  p_property_city TEXT,
  p_property_state TEXT,
  p_property_zipcode TEXT,
  p_total_price_cents INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  email_pattern TEXT := '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
  phone_pattern TEXT := '^[\+]?[1-9][\d]{3,14}$';
BEGIN
  -- Email validation
  IF p_customer_email IS NULL OR LENGTH(p_customer_email) < 5 OR LENGTH(p_customer_email) > 254 THEN
    RETURN FALSE;
  END IF;
  
  IF NOT p_customer_email ~ email_pattern THEN
    RETURN FALSE;
  END IF;
  
  -- Phone validation (basic)
  IF p_customer_phone IS NULL OR LENGTH(REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g')) < 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Address validation
  IF p_property_address IS NULL OR LENGTH(TRIM(p_property_address)) < 5 THEN
    RETURN FALSE;
  END IF;
  
  -- City validation
  IF p_property_city IS NULL OR LENGTH(TRIM(p_property_city)) < 2 THEN
    RETURN FALSE;
  END IF;
  
  -- State validation (US states)
  IF p_property_state IS NULL OR LENGTH(p_property_state) < 2 THEN
    RETURN FALSE;
  END IF;
  
  -- Zipcode validation (US format)
  IF p_property_zipcode IS NULL OR NOT p_property_zipcode ~ '^\d{5}(-\d{4})?$' THEN
    RETURN FALSE;
  END IF;
  
  -- Price validation (reasonable range: $50 - $5000)
  IF p_total_price_cents IS NULL OR p_total_price_cents < 5000 OR p_total_price_cents > 500000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit(
  p_email TEXT,
  p_ip TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  email_attempts INTEGER := 0;
  ip_attempts INTEGER := 0;
  email_blocked_until TIMESTAMPTZ;
  ip_blocked_until TIMESTAMPTZ;
  current_time TIMESTAMPTZ := now();
BEGIN
  -- Check email rate limit (max 3 bookings per hour per email)
  SELECT attempt_count, blocked_until INTO email_attempts, email_blocked_until
  FROM public.booking_rate_limits 
  WHERE identifier = p_email AND identifier_type = 'email'
    AND first_attempt_at > current_time - INTERVAL '1 hour';
  
  -- If blocked, check if block period has expired
  IF email_blocked_until IS NOT NULL AND email_blocked_until > current_time THEN
    RETURN FALSE; -- Still blocked
  END IF;
  
  -- If too many attempts in the last hour
  IF email_attempts >= 3 THEN
    -- Block for 1 hour
    INSERT INTO public.booking_rate_limits (identifier, identifier_type, attempt_count, blocked_until)
    VALUES (p_email, 'email', email_attempts, current_time + INTERVAL '1 hour')
    ON CONFLICT (identifier, identifier_type) 
    DO UPDATE SET 
      attempt_count = EXCLUDED.attempt_count,
      blocked_until = EXCLUDED.blocked_until,
      last_attempt_at = current_time;
    RETURN FALSE;
  END IF;
  
  -- Check IP rate limit if provided (max 5 bookings per hour per IP)
  IF p_ip IS NOT NULL THEN
    SELECT attempt_count, blocked_until INTO ip_attempts, ip_blocked_until
    FROM public.booking_rate_limits 
    WHERE identifier = p_ip AND identifier_type = 'ip'
      AND first_attempt_at > current_time - INTERVAL '1 hour';
    
    IF ip_blocked_until IS NOT NULL AND ip_blocked_until > current_time THEN
      RETURN FALSE; -- Still blocked
    END IF;
    
    IF ip_attempts >= 5 THEN
      INSERT INTO public.booking_rate_limits (identifier, identifier_type, attempt_count, blocked_until)
      VALUES (p_ip, 'ip', ip_attempts, current_time + INTERVAL '1 hour')
      ON CONFLICT (identifier, identifier_type) 
      DO UPDATE SET 
        attempt_count = EXCLUDED.attempt_count,
        blocked_until = EXCLUDED.blocked_until,
        last_attempt_at = current_time;
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Update attempt counters
  INSERT INTO public.booking_rate_limits (identifier, identifier_type)
  VALUES (p_email, 'email')
  ON CONFLICT (identifier, identifier_type) 
  DO UPDATE SET 
    attempt_count = booking_rate_limits.attempt_count + 1,
    last_attempt_at = current_time;
  
  IF p_ip IS NOT NULL THEN
    INSERT INTO public.booking_rate_limits (identifier, identifier_type)
    VALUES (p_ip, 'ip')
    ON CONFLICT (identifier, identifier_type) 
    DO UPDATE SET 
      attempt_count = booking_rate_limits.attempt_count + 1,
      last_attempt_at = current_time;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new secure booking insertion policy
CREATE POLICY "secure_booking_insert" ON public.bookings
  FOR INSERT 
  WITH CHECK (
    -- Validate all input data
    public.validate_booking_data(
      customer_email,
      customer_phone, 
      property_address,
      property_city,
      property_state,
      property_zipcode,
      total_price_cents
    )
    -- Rate limiting will be handled at the application level
    -- since we can't get client IP in RLS policies
  );

-- Add constraints to prevent obviously fake data
ALTER TABLE public.bookings 
  ADD CONSTRAINT IF NOT EXISTS check_email_format 
  CHECK (customer_email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

ALTER TABLE public.bookings 
  ADD CONSTRAINT IF NOT EXISTS check_reasonable_price 
  CHECK (total_price_cents >= 5000 AND total_price_cents <= 500000);

ALTER TABLE public.bookings 
  ADD CONSTRAINT IF NOT EXISTS check_valid_beds_baths 
  CHECK (property_beds >= 1 AND property_beds <= 20 AND property_baths >= 1 AND property_baths <= 20);

ALTER TABLE public.bookings 
  ADD CONSTRAINT IF NOT EXISTS check_reasonable_sqft 
  CHECK (property_sqft >= 200 AND property_sqft <= 50000);

ALTER TABLE public.bookings 
  ADD CONSTRAINT IF NOT EXISTS check_future_date 
  CHECK (cleaning_date >= CURRENT_DATE);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_rate_limits_identifier 
  ON public.booking_rate_limits(identifier, identifier_type, first_attempt_at);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
  ON public.bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_email 
  ON public.bookings(customer_email);