-- Add rate limiting function that can be called from edge functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;