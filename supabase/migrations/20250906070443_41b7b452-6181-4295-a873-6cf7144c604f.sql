-- Fix the jobs status constraint to include all needed statuses
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add updated status constraint with all valid statuses
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check 
CHECK (status = ANY (ARRAY[
  'New'::text, 
  'Claimed'::text, 
  'Assigned'::text,
  'InProgress'::text,
  'In Progress'::text, 
  'Submitted'::text, 
  'Completed'::text,
  'Approved'::text, 
  'Paid'::text, 
  'Cancelled'::text
]));

-- Create some test jobs in contractor cities for testing
INSERT INTO public.jobs (booking_id, date, price_cents, payout_cents, city, status, notes)
VALUES 
  (null, now() + interval '2 days', 15000, 10500, 'Islamabad', 'New', 'Test job for Islamabad contractor - 3BR/2BA house cleaning'),
  (null, now() + interval '3 days', 18000, 12600, 'Multan', 'New', 'Test job for Multan contractor - 4BR/3BA house cleaning'),
  (null, now() + interval '4 days', 16000, 11200, 'Islamabad', 'New', 'Test job for Islamabad contractor - 2BR/1BA apartment cleaning');