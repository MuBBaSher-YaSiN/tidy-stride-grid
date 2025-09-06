-- Create customer_payments table to track all customer payments from Stripe
CREATE TABLE public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_method TEXT, -- card, etc
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_type TEXT NOT NULL, -- 'initial' for first payment, 'recurring' for job completion payments
  stripe_fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL, -- amount after stripe fees
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for customer payments
CREATE POLICY "admins_full_access_customer_payments" 
ON public.customer_payments 
FOR ALL 
USING (is_admin());

CREATE POLICY "service_role_full_access_customer_payments" 
ON public.customer_payments 
FOR ALL 
USING (current_setting('role'::text) = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX idx_customer_payments_booking_id ON public.customer_payments(booking_id);
CREATE INDEX idx_customer_payments_job_id ON public.customer_payments(job_id);
CREATE INDEX idx_customer_payments_stripe_payment_intent ON public.customer_payments(stripe_payment_intent_id);
CREATE INDEX idx_customer_payments_customer_email ON public.customer_payments(customer_email);
CREATE INDEX idx_customer_payments_payment_status ON public.customer_payments(payment_status);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_payments_updated_at
  BEFORE UPDATE ON public.customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();

-- Update bookings table to include payment_mode for tracking subscription vs one-time
ALTER TABLE public.bookings ADD COLUMN payment_mode TEXT DEFAULT 'subscription'; -- 'one-time' or 'subscription'

-- Add index for payment_mode
CREATE INDEX idx_bookings_payment_mode ON public.bookings(payment_mode);