-- Fix search path security warning for validation function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;