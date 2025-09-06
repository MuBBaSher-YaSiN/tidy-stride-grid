import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-BOOKING-PAYMENT] ${timestamp} ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not found");
      throw new Error("Stripe configuration missing");
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    const { session_id, booking_id } = await req.json();
    logStep("Request received", { session_id, booking_id });

    if (!session_id || !booking_id) {
      logStep("ERROR: Missing required parameters");
      throw new Error("Missing session_id or booking_id");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { 
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      setupIntentId: session.setup_intent
    });

    // Get booking from database
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      logStep("ERROR: Booking not found", { error: bookingError });
      throw new Error("Booking not found");
    }
    logStep("Booking retrieved", { bookingId: booking.id, currentStatus: booking.payment_status });

    let paymentStatus = 'pending';
    let bookingStatus = 'active';

    if (session.status === 'complete') {
      if (session.mode === 'setup') {
        // For setup mode (both subscriptions and one-time with saved payment method)
        paymentStatus = 'setup_complete';
        bookingStatus = 'confirmed';
        logStep("Payment method setup completed successfully");
      } else if (session.mode === 'payment') {
        // For immediate payment mode (one-time payments)
        paymentStatus = 'completed';
        bookingStatus = 'confirmed';
        logStep("Payment completed immediately");
        
        // Update customer payment record to completed
        await supabaseClient
          .from('customer_payments')
          .update({
            payment_status: 'completed',
            stripe_charge_id: session.payment_intent ? 
              (await stripe.paymentIntents.retrieve(session.payment_intent as string)).charges.data[0]?.id 
              : null,
            paid_at: new Date().toISOString()
          })
          .eq('booking_id', booking_id)
          .eq('payment_type', 'initial');
      }
    } else {
      paymentStatus = 'failed';
      bookingStatus = 'cancelled';
      logStep("Payment setup failed", { sessionStatus: session.status });
      
      // Update customer payment record to failed if it exists
      await supabaseClient
        .from('customer_payments')
        .update({
          payment_status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: `Stripe session failed: ${session.status}`
        })
        .eq('booking_id', booking_id)
        .eq('payment_type', 'initial');
    }

    // Update booking status
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        payment_status: paymentStatus,
        booking_status: bookingStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", booking_id);

    if (updateError) {
      logStep("ERROR: Failed to update booking", { error: updateError });
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }
    logStep("Booking updated successfully", { paymentStatus, bookingStatus });

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      booking_id: booking_id,
      payment_status: paymentStatus,
      booking_status: bookingStatus,
      session_status: session.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-booking-payment", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});