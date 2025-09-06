import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${timestamp} ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not found");
      throw new Error("Stripe configuration missing");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the raw body
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event;
    
    if (webhookSecret && signature) {
      // Verify webhook signature if secret is configured
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("ERROR: Webhook signature verification failed", { error: err.message });
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      // Parse without verification if no secret configured
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification");
    }

    logStep("Processing webhook event", { type: event.type, id: event.id });

    // Record all events in payment_events table for audit
    const { error: eventError } = await supabaseClient
      .from("payment_events")
      .insert({
        event_type: event.type,
        stripe_object_id: event.data.object.id,
        payload: event
      });

    if (eventError) {
      logStep("ERROR: Failed to record payment event", { error: eventError });
    } else {
      logStep("Payment event recorded");
    }

    // Process specific event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, supabaseClient);
        break;
      
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object, supabaseClient);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, supabaseClient);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, supabaseClient);
        break;
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutSessionCompleted(session: any, supabaseClient: any) {
  logStep("Handling checkout session completed", { sessionId: session.id, mode: session.mode });
  
  // Find booking by session metadata or customer email
  let booking = null;
  
  if (session.metadata?.booking_id) {
    const { data } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", session.metadata.booking_id)
      .single();
    booking = data;
  }

  if (!booking && session.customer_details?.email) {
    const { data } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("customer_email", session.customer_details.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    booking = data;
  }

  if (booking) {
    logStep("Found booking for session", { bookingId: booking.id });
    
    // Update booking status
    await supabaseClient
      .from("bookings")
      .update({ 
        payment_status: session.mode === 'setup' ? 'setup_completed' : 'completed'
      })
      .eq("id", booking.id);
      
    logStep("Updated booking payment status");
  }
}

async function handleSetupIntentSucceeded(setupIntent: any, supabaseClient: any) {
  logStep("Handling setup intent succeeded", { setupIntentId: setupIntent.id });
  // Setup intents are for saving payment methods - no immediate action needed
}

async function handlePaymentIntentSucceeded(paymentIntent: any, supabaseClient: any) {
  logStep("Handling payment intent succeeded", { paymentIntentId: paymentIntent.id });
  
  // Update customer_payments record if exists
  const { error } = await supabaseClient
    .from("customer_payments")
    .update({ 
      payment_status: 'completed',
      paid_at: new Date().toISOString()
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);
    
  if (error) {
    logStep("ERROR: Failed to update customer payment", { error });
  } else {
    logStep("Updated customer payment status");
  }
}

async function handlePaymentIntentFailed(paymentIntent: any, supabaseClient: any) {
  logStep("Handling payment intent failed", { paymentIntentId: paymentIntent.id });
  
  // Update customer_payments record if exists
  const { error } = await supabaseClient
    .from("customer_payments")
    .update({ 
      payment_status: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);
    
  if (error) {
    logStep("ERROR: Failed to update customer payment", { error });
  } else {
    logStep("Updated customer payment failure status");
  }
}