-- Add the missing RLS policy for booking_rate_limits table
CREATE POLICY "service_role_rate_limits" ON public.booking_rate_limits
  FOR ALL USING (current_setting('role', true) = 'service_role');