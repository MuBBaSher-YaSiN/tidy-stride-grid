-- A) Add normalized city columns (stored, auto-updated)
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS city_norm text GENERATED ALWAYS AS (lower(trim(city))) STORED;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS city_norm text GENERATED ALWAYS AS (lower(trim(city))) STORED;

-- Optional helpful indexes
CREATE INDEX IF NOT EXISTS idx_jobs_citynorm_status ON public.jobs(city_norm, status);
CREATE INDEX IF NOT EXISTS idx_contractors_citynorm ON public.contractors(city_norm);

-- B) Backfill (generated columns compute automatically; this just touches rows if needed)
UPDATE public.contractors SET city = city WHERE true;
UPDATE public.jobs SET city = city WHERE true;

-- C) Replace job RLS with city_norm logic
DROP POLICY IF EXISTS "contractors_see_available" ON public.jobs;
DROP POLICY IF EXISTS "contractors_see_own" ON public.jobs;
DROP POLICY IF EXISTS "contractors_claim" ON public.jobs;
DROP POLICY IF EXISTS "contractors_update_own" ON public.jobs;

-- Contractors SEE 'New' jobs in their own city (case/space safe)
CREATE POLICY "contractors_see_available"
ON public.jobs
FOR SELECT
USING (
  status = 'New'
  AND EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.user_id = auth.uid()
      AND c.city_norm = public.jobs.city_norm
  )
);

-- Contractors SEE their claimed/assigned jobs
CREATE POLICY "contractors_see_own"
ON public.jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.user_id = auth.uid()
      AND (public.jobs.claimed_by = c.id OR public.jobs.contractor_id = c.id)
  )
);

-- Contractors can CLAIM a New job in their city
CREATE POLICY "contractors_claim"
ON public.jobs
FOR UPDATE
USING (
  status = 'New'
  AND claimed_by IS NULL
  AND EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.user_id = auth.uid()
      AND c.city_norm = public.jobs.city_norm
  )
)
WITH CHECK (
  status IN ('New', 'Claimed')
  AND claimed_by = (
    SELECT c.id FROM public.contractors c
    WHERE c.user_id = auth.uid()
    LIMIT 1
  )
);

-- Contractors may UPDATE their own jobs (start, submit, etc.)
CREATE POLICY "contractors_update_own"
ON public.jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.user_id = auth.uid()
      AND (public.jobs.claimed_by = c.id OR public.jobs.contractor_id = c.id)
  )
);