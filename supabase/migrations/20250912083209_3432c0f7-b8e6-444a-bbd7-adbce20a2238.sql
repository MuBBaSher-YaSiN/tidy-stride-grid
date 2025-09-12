-- Remove unique constraint on booking_id to allow multiple jobs per booking
-- This is needed for vacation rental properties where one booking can have multiple checkout dates
DROP INDEX IF EXISTS public.jobs_booking_id_key;