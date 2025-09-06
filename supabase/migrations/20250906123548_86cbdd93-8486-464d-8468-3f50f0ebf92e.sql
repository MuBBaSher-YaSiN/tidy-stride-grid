-- Add payment_requests table for contractor payouts (if not exists)
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add status constraint to jobs table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'jobs_status_check' 
    AND table_name = 'jobs'
  ) THEN
    ALTER TABLE public.jobs 
    ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('New','Claimed','Assigned','InProgress','Submitted','Completed','Approved','Paid','Cancelled','Rejected'));
  END IF;
END $$;

-- Add city_norm columns if they don't exist
ALTER TABLE public.contractors 
ADD COLUMN IF NOT EXISTS city_norm TEXT GENERATED ALWAYS AS (lower(trim(city))) STORED;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS city_norm TEXT GENERATED ALWAYS AS (lower(trim(city))) STORED;

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_contractors_city_norm ON public.contractors(city_norm);
CREATE INDEX IF NOT EXISTS idx_jobs_city_norm ON public.jobs(city_norm);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_job_contractor ON public.payment_requests(job_id, contractor_id);

-- Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Function to auto-create payment request when job is submitted
CREATE OR REPLACE FUNCTION public.on_job_submitted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Submitted' AND OLD.status != 'Submitted' AND (NEW.claimed_by IS NOT NULL OR NEW.contractor_id IS NOT NULL) THEN
    INSERT INTO public.payment_requests(job_id, contractor_id, amount_cents)
    VALUES (
      NEW.id, 
      COALESCE(NEW.contractor_id, NEW.claimed_by), 
      COALESCE(NEW.payout_cents, 0)
    )
    ON CONFLICT (job_id, contractor_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto payment request creation
DROP TRIGGER IF EXISTS trg_job_submitted ON public.jobs;
CREATE TRIGGER trg_job_submitted 
  AFTER UPDATE ON public.jobs
  FOR EACH ROW 
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_job_submitted();

-- Update jobs RLS to use city_norm
DROP POLICY IF EXISTS "contractors_see_available" ON public.jobs;
CREATE POLICY "contractors_see_available" ON public.jobs
  FOR SELECT
  USING (
    status = 'New' AND 
    EXISTS (
      SELECT 1 FROM contractors c
      WHERE c.user_id = auth.uid() 
      AND c.city_norm = jobs.city_norm
    )
  );

-- Add unique constraint to prevent duplicate payment requests (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payment_requests_job_contractor_unique' 
    AND table_name = 'payment_requests'
  ) THEN
    ALTER TABLE public.payment_requests 
    ADD CONSTRAINT payment_requests_job_contractor_unique 
    UNIQUE (job_id, contractor_id);
  END IF;
END $$;