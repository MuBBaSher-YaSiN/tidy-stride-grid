-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "contractors_update_claimed_jobs" ON public.jobs;
DROP POLICY IF EXISTS "contractors_claim_jobs" ON public.jobs;

-- Fix RLS policies for contractors table to allow admins to create contractors
DROP POLICY IF EXISTS "service_role_full_access_contractors" ON public.contractors;
DROP POLICY IF EXISTS "contractors_select_own_data" ON public.contractors;
DROP POLICY IF EXISTS "contractors_update_own_data" ON public.contractors;

-- Allow admins to create, read, update contractors
CREATE POLICY "admin_full_access_contractors" 
ON public.contractors 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Allow contractors to view and update their own data
CREATE POLICY "contractors_select_own_data" 
ON public.contractors 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "contractors_update_own_data" 
ON public.contractors 
FOR UPDATE 
USING (id = auth.uid());

-- Service role still has full access
CREATE POLICY "service_role_full_access_contractors" 
ON public.contractors 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- Add job workflow columns
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.contractors(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS admin_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create payment_requests table for tracking contractor payment requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_requests
CREATE POLICY "admin_full_access_payment_requests" 
ON public.payment_requests 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "contractors_view_own_payment_requests" 
ON public.payment_requests 
FOR SELECT 
USING (contractor_id = auth.uid());

CREATE POLICY "service_role_full_access_payment_requests" 
ON public.payment_requests 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- New job policies for contractor workflow
CREATE POLICY "contractors_claim_jobs_new" 
ON public.jobs 
FOR UPDATE 
USING (
    status = 'New' AND 
    city IN (SELECT city FROM public.contractors WHERE id = auth.uid()) AND
    (contractor_id IS NULL OR claimed_by IS NULL)
);

CREATE POLICY "contractors_update_owned_jobs" 
ON public.jobs 
FOR UPDATE 
USING (
    contractor_id = auth.uid() OR 
    claimed_by = auth.uid()
);