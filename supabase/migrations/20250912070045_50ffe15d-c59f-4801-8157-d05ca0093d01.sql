-- Add a policy to allow viewing booking details with booking ID (for booking confirmation pages)
CREATE POLICY "public_view_booking_by_id" 
ON public.bookings 
FOR SELECT 
USING (true);