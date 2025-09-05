-- Ensure admin user profile exists with admin role
INSERT INTO public.profiles (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@cleannami.com'
ON CONFLICT (id) DO UPDATE SET role = excluded.role;

-- Update any remaining RLS policies to use is_admin() consistently
-- Replace admin_users references with is_admin() function calls

-- Update bookings policies
DROP POLICY IF EXISTS "admin_select_bookings" ON public.bookings;
CREATE POLICY "admins_select_bookings"
ON public.bookings
FOR SELECT USING (public.is_admin());

-- Update payment_events policies  
DROP POLICY IF EXISTS "admin_select_payment_events" ON public.payment_events;
CREATE POLICY "admins_select_payment_events"
ON public.payment_events
FOR SELECT USING (public.is_admin());

-- Update customers policies
DROP POLICY IF EXISTS "admin_select_customers" ON public.customers;
CREATE POLICY "admins_select_customers"
ON public.customers
FOR SELECT USING (public.is_admin());

-- Update properties policies
DROP POLICY IF EXISTS "admin_select_properties" ON public.properties;
CREATE POLICY "admins_select_properties"
ON public.properties
FOR SELECT USING (public.is_admin());

-- Update subscriptions policies
DROP POLICY IF EXISTS "admin_select_subscriptions" ON public.subscriptions;
CREATE POLICY "admins_select_subscriptions"
ON public.subscriptions
FOR SELECT USING (public.is_admin());

-- Update jobs policies
DROP POLICY IF EXISTS "admin_select_jobs" ON public.jobs;
CREATE POLICY "admins_select_jobs"
ON public.jobs
FOR SELECT USING (public.is_admin());

-- Update payment_requests policies
DROP POLICY IF EXISTS "admin_full_access_payment_requests" ON public.payment_requests;
CREATE POLICY "admins_full_access_payment_requests"
ON public.payment_requests
FOR ALL USING (public.is_admin());