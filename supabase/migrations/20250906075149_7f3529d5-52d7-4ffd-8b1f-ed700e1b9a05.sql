-- Update existing test jobs to match contractor cities (only city field, city_norm is auto-generated)
UPDATE public.jobs 
SET city = 'Islamabad'
WHERE status = 'New' AND id IN (
  '375147c2-0143-449f-bb29-b3adda2f1611',
  '5bb2b386-4b93-4fef-b752-658e3f01deb6', 
  'bb287a81-5304-4eca-a261-dbe47a59d18e',
  '35caffb0-8dfb-4321-b9ca-edab82a3de44'
);

UPDATE public.jobs 
SET city = 'Karachi'
WHERE status = 'New' AND id IN (
  '3bdb289a-7de3-4a0e-9202-315aa7fdeaca',
  '308e05e8-2c02-479d-b55c-b5bd40801d5e',
  '9f37a2d9-7cce-487d-b0bc-880984433e60',
  'de0fb887-78ca-41c9-bfeb-883d791227a3'
);

UPDATE public.jobs 
SET city = 'Multan'
WHERE status = 'New' AND id IN (
  'eb64cd18-b7c6-4cb9-8ebd-c7a202863ba5',
  'a20d4b2d-4f94-4627-a98d-0b407d762fb5',
  '4d622275-7403-4779-b029-3cbad2e338af',
  '75c43766-0546-4e81-8c57-3ab2349e7b8a'
);

-- Add more test jobs distributed across contractor cities
INSERT INTO public.jobs (booking_id, date, price_cents, payout_cents, city, status, notes)
VALUES 
  (null, now() + interval '1 day', 14000, 9800, 'Islamabad', 'New', 'House cleaning - 2BR/2BA in F-7 sector'),
  (null, now() + interval '2 days', 16000, 11200, 'Karachi', 'New', 'Apartment cleaning - DHA Phase 5'),
  (null, now() + interval '3 days', 15500, 10850, 'Multan', 'New', 'Villa cleaning - Cantt area'),
  (null, now() + interval '4 days', 17000, 11900, 'Islamabad', 'New', 'Office cleaning - Blue Area'),
  (null, now() + interval '5 days', 13000, 9100, 'Karachi', 'New', 'Studio apartment - Clifton');