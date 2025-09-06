-- Drop existing policies first
DROP POLICY IF EXISTS "secure_booking_insert" ON public.bookings;
DROP POLICY IF EXISTS "service_role_rate_limits" ON public.booking_rate_limits;

-- Only create the secure policy - the validation function and table already exist
CREATE POLICY "secure_booking_insert" ON public.bookings
  FOR INSERT 
  WITH CHECK (
    -- Comprehensive validation to prevent fake bookings
    public.validate_booking_data(
      customer_email,
      customer_phone, 
      property_address,
      property_city,
      property_state,
      property_zipcode,
      total_price_cents
    )
    AND customer_email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND total_price_cents >= 5000 AND total_price_cents <= 500000
    AND property_beds >= 1 AND property_beds <= 20 
    AND property_baths >= 1 AND property_baths <= 20
    AND property_sqft >= 200 AND property_sqft <= 50000
    AND cleaning_date >= CURRENT_DATE
    AND LENGTH(TRIM(property_address)) >= 5
    AND LENGTH(TRIM(property_city)) >= 2
    AND LENGTH(TRIM(customer_name)) >= 2
  );