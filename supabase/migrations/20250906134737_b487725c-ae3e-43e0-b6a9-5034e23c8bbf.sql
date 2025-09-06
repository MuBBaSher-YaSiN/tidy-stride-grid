-- Add missing cleaning_type column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN cleaning_type TEXT DEFAULT 'one-time';