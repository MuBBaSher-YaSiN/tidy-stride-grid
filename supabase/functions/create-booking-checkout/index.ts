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
  console.log(`[CREATE-BOOKING-CHECKOUT] ${timestamp} ${step}${detailsStr}`);
};

// Helper function to parse time safely
const parseTime24Hour = (timeStr: string): string => {
  if (!timeStr) return "10:00";
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "10:00";
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3]?.toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
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
    logStep("Stripe key verified");

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    logStep("Supabase client initialized");

    // Parse request body
    const bookingData = await req.json();
    logStep("Booking data received", { 
      customerEmail: bookingData.customerEmail,
      serviceType: bookingData.serviceType,
      totalPrice: bookingData.totalPrice,
      cleaningType: bookingData.cleaningType
    });

    // Validate required fields
    const requiredFields = [
      'customerName', 'customerEmail', 'customerPhone',
      'address', 'city', 'state', 'zipcode', 'beds', 'baths', 'sqft',
      'serviceType', 'startDate', 'frequency', 'totalPrice'
    ];
    
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        logStep("ERROR: Missing required field", { field });
        throw new Error(`Missing required field: ${field}`);
      }
    }
    logStep("All required fields validated");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customerEmail)) {
      logStep("ERROR: Invalid email format", { email: bookingData.customerEmail });
      throw new Error(`Invalid email address: ${bookingData.customerEmail}`);
    }

    // Check if customer already exists
    const customers = await stripe.customers.list({ 
      email: bookingData.customerEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: bookingData.customerEmail,
        name: bookingData.customerName,
        phone: bookingData.customerPhone,
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Determine payment mode based on cleaningType
    const isSubscription = bookingData.cleaningType === "subscription";
    const checkoutMode = isSubscription ? "setup" : "payment";
    
    logStep("Payment mode determined", { 
      cleaningType: bookingData.cleaningType, 
      isSubscription, 
      checkoutMode 
    });

    // Parse time and create proper job date
    const time24 = parseTime24Hour(bookingData.startTime);
    const jobDateIso = `${bookingData.startDate}T${time24}:00Z`;
    logStep("Job date parsed", { originalTime: bookingData.startTime, time24, jobDateIso });

    // Insert booking into database first
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        customer_name: bookingData.customerName,
        customer_email: bookingData.customerEmail,
        customer_phone: bookingData.customerPhone,
        property_address: bookingData.address,
        property_city: bookingData.city,
        property_state: bookingData.state,
        property_zipcode: bookingData.zipcode,
        property_beds: bookingData.beds,
        property_baths: bookingData.baths,
        property_half_baths: bookingData.halfBaths || 0,
        property_sqft: bookingData.sqft,
        service_type: bookingData.serviceType,
        cleaning_date: bookingData.startDate,
        cleaning_time: bookingData.startTime,
        subscription_months: bookingData.months,
        deep_cleaning: bookingData.addOns?.deepCleaning || false,
        laundry: bookingData.addOns?.laundry || false,
        inside_fridge: bookingData.addOns?.insideFridge || false,
        inside_windows: bookingData.addOns?.insideWindows || false,
        frequency: bookingData.cleaningType === 'one-time' ? 'one-time' : bookingData.frequency,
        base_price_cents: Math.round(bookingData.basePrice * 100),
        total_price_cents: Math.round(bookingData.totalPrice * 100),
        parking_info: bookingData.parkingInfo,
        schedule_flexibility: bookingData.scheduleFlexibility,
        access_method: bookingData.accessMethod,
        special_instructions: bookingData.specialInstructions,
        stripe_customer_id: customerId,
        payment_mode: isSubscription ? "subscription" : "one-time",
        payment_status: isSubscription ? "pending" : "processing",
        booking_status: "processing"
      })
      .select()
      .single();

    if (bookingError) {
      logStep("ERROR: Failed to create booking", { error: bookingError });
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    logStep("Booking created successfully", { bookingId: booking.id });

    // Create job record using the helper function
    try {
      const { data: jobData, error: jobError } = await supabaseClient
        .from("jobs")
        .insert({
          booking_id: booking.id,
          date: jobDateIso,
          price_cents: Math.round(bookingData.totalPrice * 100),
          payout_cents: Math.round(bookingData.totalPrice * 100 * 0.7),
          city: bookingData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${bookingData.customerName} - ${bookingData.address}`
        })
        .select()
        .single();
      
      if (jobError) {
        logStep("WARNING: Failed to create job via direct insert", { error: jobError });
        // Fallback to RPC function
        const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('create_job_from_booking', {
          p_booking_id: booking.id
        });
        if (rpcError) {
          logStep("WARNING: Failed to create job via RPC", { error: rpcError });
        } else {
          logStep("Job created via RPC fallback", { jobId: rpcResult });
        }
      } else {
        logStep("Job created successfully", { jobId: jobData.id });
      }
    } catch (jobErr) {
      logStep("WARNING: Job creation failed", { error: jobErr });
      // Don't fail the entire booking process if job creation fails
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Determine if this is a subscription or one-time payment
    const isSubscription = bookingData.cleaningType === 'subscription';
    
    if (isSubscription) {
      logStep("Creating setup session for subscription");
      
      // For subscriptions, we use setup mode to save payment method for future charges
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "setup",
        payment_method_types: ["card"],
        success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${origin}/booking-cancelled?booking_id=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          service_type: bookingData.serviceType,
          frequency: bookingData.frequency
        }
      });

      // Update booking with setup intent ID and payment mode
      await supabaseClient
        .from("bookings")
        .update({ 
          stripe_setup_intent_id: session.setup_intent,
          payment_mode: 'subscription'
        })
        .eq("id", booking.id);

      // Create a job from the booking for admin dashboard (with fallback to RPC)
      const { data: jobRow, error: jobErr } = await supabaseClient
        .from("jobs")
        .insert({
          booking_id: booking.id,
          date: `${bookingData.startDate}T${(bookingData.startTime || '10:00')}:00Z`,
          price_cents: Math.round(bookingData.totalPrice * 100),
          payout_cents: Math.round(bookingData.totalPrice * 100 * 0.7),
          contractor_id: null,
          is_first_clean: true,
          city: bookingData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${bookingData.customerName} - ${bookingData.address}`
        })
        .select()
        .single();

      if (jobErr) {
        console.log("[CREATE-BOOKING-CHECKOUT] ERROR: job insert failed", jobErr);
        // fallback to RPC (uses the DB function above)
        const { data: rpcData, error: rpcErr } = await supabaseClient
          .rpc("create_job_from_booking", { p_booking_id: booking.id });
        if (rpcErr) {
          console.log("[CREATE-BOOKING-CHECKOUT] ERROR: RPC create_job_from_booking failed", rpcErr);
          // don't block Stripe flow, but we need a job; surface a warning in logs
        } else {
          console.log("[CREATE-BOOKING-CHECKOUT] Fallback RPC created job", rpcData);
        }
      } else {
        console.log("[CREATE-BOOKING-CHECKOUT] Job created", jobRow?.id);
      }

      logStep("Setup session created and job created", { sessionId: session.id, url: session.url });
      
      return new Response(JSON.stringify({ 
        url: session.url,
        booking_id: booking.id,
        session_id: session.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Creating immediate payment for one-time service");
      
      // For one-time payments, charge immediately using payment mode
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment", // Use payment mode for immediate charge
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `${bookingData.serviceType} - One Time Cleaning`,
              description: `${bookingData.beds}BR/${bookingData.baths}BA - ${bookingData.address}, ${bookingData.city}`
            },
            unit_amount: Math.round(bookingData.totalPrice * 100)
          },
          quantity: 1
        }],
        success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${origin}/booking-cancelled?booking_id=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          service_type: bookingData.serviceType,
          payment_type: 'one-time'
        }
      });

      // Update booking with payment mode and session info
      await supabaseClient
        .from("bookings")
        .update({ 
          payment_mode: 'one-time',
          payment_status: 'processing'
        })
        .eq("id", booking.id);

      // Create a job from the booking for admin dashboard (with fallback to RPC)
      const { data: jobRow, error: jobErr } = await supabaseClient
        .from("jobs")
        .insert({
          booking_id: booking.id,
          date: `${bookingData.startDate}T${(bookingData.startTime || '10:00')}:00Z`,
          price_cents: Math.round(bookingData.totalPrice * 100),
          payout_cents: Math.round(bookingData.totalPrice * 100 * 0.7),
          contractor_id: null,
          is_first_clean: true,
          city: bookingData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${bookingData.customerName} - ${bookingData.address}`
        })
        .select()
        .single();

      if (jobErr) {
        console.log("[CREATE-BOOKING-CHECKOUT] ERROR: job insert failed", jobErr);
        // fallback to RPC (uses the DB function above)
        const { data: rpcData, error: rpcErr } = await supabaseClient
          .rpc("create_job_from_booking", { p_booking_id: booking.id });
        if (rpcErr) {
          console.log("[CREATE-BOOKING-CHECKOUT] ERROR: RPC create_job_from_booking failed", rpcErr);
          // don't block Stripe flow, but we need a job; surface a warning in logs
        } else {
          console.log("[CREATE-BOOKING-CHECKOUT] Fallback RPC created job", rpcData);
        }
      } else {
        console.log("[CREATE-BOOKING-CHECKOUT] Job created", jobRow?.id);
      }

      logStep("One-time payment session created", { 
        sessionId: session.id,
        url: session.url
      });
      
      return new Response(JSON.stringify({ 
        url: session.url,
        booking_id: booking.id,
        session_id: session.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-booking-checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});