-- Fix remaining security issues by restricting SELECT access to public data

-- 1. Fix bookings table - no public SELECT access
CREATE POLICY "no_public_select_bookings" ON public.bookings
FOR SELECT 
USING (false);

-- 2. Fix customers table - no public SELECT access  
CREATE POLICY "no_public_select_customers" ON public.customers
FOR SELECT 
USING (false);

-- 3. Fix properties table - no public SELECT access
CREATE POLICY "no_public_select_properties" ON public.properties
FOR SELECT 
USING (false);

-- 4. Fix payment_events table - no public SELECT access
CREATE POLICY "no_public_select_payment_events" ON public.payment_events
FOR SELECT 
USING (false);

-- 5. Fix subscriptions table - no public SELECT access
CREATE POLICY "no_public_select_subscriptions" ON public.subscriptions
FOR SELECT 
USING (false);

-- 6. Fix magic_links table - no public SELECT access (only service role should access)
CREATE POLICY "no_public_select_magic_links" ON public.magic_links
FOR SELECT 
USING (false);