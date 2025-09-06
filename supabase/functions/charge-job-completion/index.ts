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
  console.log(`[CHARGE-JOB-COMPLETION] ${timestamp} ${step}${detailsStr}`);
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
    const { job_id } = await req.json();
    logStep("Job completion charge request", { job_id });

    if (!job_id) {
      throw new Error("job_id is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get job and booking details
    const { data: job, error: jobError } = await supabaseClient
      .from("jobs")
      .select(`
        *,
        bookings!inner (
          id,
          customer_name,
          customer_email,
          stripe_customer_id,
          payment_mode,
          payment_status,
          total_price_cents
        )
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      logStep("ERROR: Job not found", { error: jobError });
      throw new Error(`Job not found: ${job_id}`);
    }

    logStep("Job and booking data retrieved", { 
      jobId: job.id, 
      bookingId: job.bookings.id,
      paymentMode: job.bookings.payment_mode 
    });

    // Only charge for subscription bookings, one-time payments are already charged
    if (job.bookings.payment_mode !== 'subscription') {
      logStep("Job is not subscription-based, no charging needed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "One-time payment already processed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get customer's saved payment method
    const customer = await stripe.customers.retrieve(job.bookings.stripe_customer_id);
    if (!customer || customer.deleted) {
      throw new Error("Customer not found in Stripe");
    }

    // Get the customer's default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: job.bookings.stripe_customer_id,
      type: 'card',
      limit: 1
    });

    if (paymentMethods.data.length === 0) {
      throw new Error("No payment method found for customer");
    }

    const paymentMethodId = paymentMethods.data[0].id;
    logStep("Payment method found", { paymentMethodId });

    // Create payment intent and charge immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: job.payout_cents, // Use the job's payout amount
      currency: "usd",
      customer: job.bookings.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true, // Charge immediately
      return_url: `${req.headers.get("origin") || "http://localhost:3000"}/`,
      metadata: {
        job_id: job.id,
        booking_id: job.bookings.id,
        payment_type: 'job_completion'
      }
    });

    logStep("Payment intent created and charged", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Record the payment in customer_payments table
    const { error: paymentError } = await supabaseClient
      .from("customer_payments")
      .insert({
        booking_id: job.bookings.id,
        job_id: job.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.charges.data[0]?.id,
        customer_email: job.bookings.customer_email,
        customer_name: job.bookings.customer_name,
        amount_cents: job.payout_cents,
        payment_status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
        payment_type: 'recurring',
        payment_method: 'card',
        stripe_fee_cents: Math.round(job.payout_cents * 0.029 + 30), // Estimate Stripe fees
        net_amount_cents: Math.round(job.payout_cents * 0.971),
        paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
        failed_at: paymentIntent.status === 'failed' ? new Date().toISOString() : null,
        failure_reason: paymentIntent.status === 'failed' ? paymentIntent.last_payment_error?.message : null
      });

    if (paymentError) {
      logStep("ERROR: Failed to record payment", { error: paymentError });
      // Don't fail the entire request, just log the error
    } else {
      logStep("Payment recorded successfully");
    }

    return new Response(JSON.stringify({ 
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: job.payout_cents
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in charge-job-completion", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});