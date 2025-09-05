-- Ensure jobs are automatically created when bookings are created
-- Update the existing create-booking-checkout function to properly create jobs

-- First, let's make sure the jobs table has all the necessary fields for the booking flow
-- Add any missing fields that might be needed

-- Check if we need to update job creation to include proper city mapping from bookings
-- Ensure that when a booking is created, a corresponding job is created with proper status flow

-- Make sure job statuses follow the proper flow:
-- New (from booking) -> Claimed (contractor claims) -> Assigned (admin assigns) -> InProgress (contractor starts) -> Submitted (contractor completes) -> Completed (admin approves)

-- Also ensure that the jobs table includes proper references to booking data
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);

-- Create an index for better performance when looking up jobs by booking
CREATE INDEX IF NOT EXISTS idx_jobs_booking_id ON jobs(booking_id);

-- Update any existing jobs that might not have proper status
UPDATE jobs SET status = 'New' WHERE status IS NULL OR status = '';

-- Ensure that city field is properly populated for contractor filtering
-- Jobs should inherit city from the booking's property city
UPDATE jobs 
SET city = b.property_city 
FROM bookings b 
WHERE jobs.booking_id = b.id AND (jobs.city IS NULL OR jobs.city = '');