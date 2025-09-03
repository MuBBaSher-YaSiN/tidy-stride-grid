-- Fix all security vulnerabilities by adding proper RLS policies

-- 1. Fix customers table - restrict to admins and service roles only
DROP POLICY IF EXISTS "admin_full_access_customers" ON public.customers;
DROP POLICY IF EXISTS "service_role_full_access_customers" ON public.customers;

CREATE POLICY "admin_select_customers" ON public.customers
FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "service_role_full_access_customers" ON public.customers
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 2. Fix bookings table - only allow public INSERT, restrict SELECT/UPDATE to service roles
DROP POLICY IF EXISTS "public_insert_bookings" ON public.bookings;
DROP POLICY IF EXISTS "service_role_full_access_bookings" ON public.bookings;

CREATE POLICY "public_insert_bookings" ON public.bookings
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "service_role_full_access_bookings" ON public.bookings
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 3. Fix contractors table - only allow contractors to see their own data
DROP POLICY IF EXISTS "contractors_select_own_data" ON public.contractors;
DROP POLICY IF EXISTS "contractors_update_own_data" ON public.contractors;

CREATE POLICY "contractors_select_own_data" ON public.contractors
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "contractors_update_own_data" ON public.contractors
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "service_role_full_access_contractors" ON public.contractors
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 4. Fix properties table - restrict to admins and service roles
DROP POLICY IF EXISTS "admin_full_access_properties" ON public.properties;
DROP POLICY IF EXISTS "service_role_full_access_properties" ON public.properties;

CREATE POLICY "admin_select_properties" ON public.properties
FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "service_role_full_access_properties" ON public.properties
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 5. Fix admin_users table - already has correct policy, just ensure it's the only one
DROP POLICY IF EXISTS "admin_select_own_data" ON public.admin_users;

CREATE POLICY "admin_select_own_data" ON public.admin_users
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "service_role_full_access_admin_users" ON public.admin_users
FOR ALL
USING (current_setting('role'::text) = 'service_role'::text);

-- 6. Fix magic_links table - service role only (already correct)
-- No changes needed, already restricted to service role

-- 7. Fix payment_events table - restrict to admins and service roles only
DROP POLICY IF EXISTS "admin_full_access_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "service_role_full_access_payment_events" ON public.payment_events;

CREATE POLICY "admin_select_payment_events" ON public.payment_events
FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "service_role_full_access_payment_events" ON public.payment_events
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 8. Fix jobs table - current policies are reasonable, add service role access
DROP POLICY IF EXISTS "admin_full_access_jobs" ON public.jobs;
DROP POLICY IF EXISTS "contractors_select_jobs" ON public.jobs;
DROP POLICY IF EXISTS "contractors_update_claimed_jobs" ON public.jobs;
DROP POLICY IF EXISTS "service_role_full_access_jobs" ON public.jobs;

CREATE POLICY "admin_select_jobs" ON public.jobs
FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "contractors_select_local_jobs" ON public.jobs
FOR SELECT 
USING (city IN (SELECT contractors.city FROM contractors WHERE contractors.id = auth.uid()));

CREATE POLICY "contractors_update_claimed_jobs" ON public.jobs
FOR UPDATE 
USING (contractor_id = auth.uid());

CREATE POLICY "service_role_full_access_jobs" ON public.jobs
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- 9. Fix subscriptions table - restrict to admins and service roles
DROP POLICY IF EXISTS "admin_full_access_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "service_role_full_access_subscriptions" ON public.subscriptions;

CREATE POLICY "admin_select_subscriptions" ON public.subscriptions
FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "service_role_full_access_subscriptions" ON public.subscriptions
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);