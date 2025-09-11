-- Add iCal URL storage to bookings table for tracking guest calendars
ALTER TABLE public.bookings 
ADD COLUMN ical_urls TEXT[] DEFAULT '{}',
ADD COLUMN ical_validation_status TEXT DEFAULT 'pending',
ADD COLUMN last_ical_sync TIMESTAMP WITH TIME ZONE;

-- Create a table to track iCal events and prevent duplicates
CREATE TABLE public.ical_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  event_uid TEXT NOT NULL,
  event_start TIMESTAMP WITH TIME ZONE NOT NULL,
  event_end TIMESTAMP WITH TIME ZONE NOT NULL,
  event_summary TEXT,
  checkout_date DATE NOT NULL,
  job_created BOOLEAN DEFAULT false,
  job_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate events per booking
  UNIQUE(booking_id, event_uid, event_end)
);

-- Enable RLS on ical_events table
ALTER TABLE public.ical_events ENABLE ROW LEVEL SECURITY;

-- Create policies for ical_events
CREATE POLICY "admins_full_access_ical_events" 
ON public.ical_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "service_role_full_access_ical_events" 
ON public.ical_events 
FOR ALL 
USING (current_setting('role'::text) = 'service_role');

-- Add trigger for updated_at on ical_events
CREATE TRIGGER update_ical_events_updated_at
BEFORE UPDATE ON public.ical_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key reference to bookings
ALTER TABLE public.ical_events
ADD CONSTRAINT ical_events_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Add foreign key reference to jobs (nullable since job might not exist yet)
ALTER TABLE public.ical_events
ADD CONSTRAINT ical_events_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;