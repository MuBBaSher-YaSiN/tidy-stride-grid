-- Fix the timestamp comparison issue in check constraint
-- Remove problematic constraint and recreate properly
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cleaning_date_check;

-- Add proper date constraint without timestamp comparison
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_cleaning_date_future 
CHECK (cleaning_date >= CURRENT_DATE);