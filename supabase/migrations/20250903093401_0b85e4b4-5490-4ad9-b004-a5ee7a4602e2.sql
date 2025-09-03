-- Create bookings table for tracking all booking requests
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer information
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Property details
  property_address TEXT NOT NULL,
  property_city TEXT NOT NULL,
  property_state TEXT NOT NULL,
  property_zipcode TEXT NOT NULL,
  property_beds INTEGER NOT NULL,
  property_baths INTEGER NOT NULL,
  property_half_baths INTEGER DEFAULT 0,
  property_sqft INTEGER NOT NULL,
  
  -- Service details
  service_type TEXT NOT NULL, -- 'vacation_rental' or 'residential'
  cleaning_date DATE NOT NULL,
  cleaning_time TIME,
  subscription_months INTEGER, -- NULL for one-time, 1-6 for subscriptions
  
  -- Add-ons
  deep_cleaning BOOLEAN DEFAULT false,
  laundry BOOLEAN DEFAULT false,
  inside_fridge BOOLEAN DEFAULT false,
  inside_windows BOOLEAN DEFAULT false,
  
  -- Frequency and pricing
  frequency TEXT NOT NULL, -- 'one-time', 'weekly', 'bi-weekly', 'tri-weekly', 'monthly'
  base_price_cents INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  
  -- Additional info
  parking_info TEXT,
  schedule_flexibility TEXT,
  access_method TEXT,
  special_instructions TEXT,
  
  -- Payment and status
  stripe_customer_id TEXT,
  stripe_setup_intent_id TEXT, -- For subscriptions
  stripe_payment_intent_id TEXT, -- For one-time payments
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'setup_complete', 'paid', 'failed'
  booking_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'completed'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "public_insert_bookings" ON public.bookings
  FOR INSERT
  WITH CHECK (true);

-- Create policy for service role to manage bookings
CREATE POLICY "service_role_full_access_bookings" ON public.bookings
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX idx_bookings_email ON public.bookings(customer_email);
CREATE INDEX idx_bookings_date ON public.bookings(cleaning_date);
CREATE INDEX idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX idx_bookings_stripe_customer ON public.bookings(stripe_customer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();