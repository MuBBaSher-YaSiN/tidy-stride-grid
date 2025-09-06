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

    // Initialize Supabase client with service role for rate limiting
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    logStep("Supabase client initialized");

    // Parse request body first
    const requestData = await req.json();
    logStep("Booking data received", { 
      customerEmail: requestData.customerEmail,
      serviceType: requestData.serviceType,
      totalPrice: requestData.totalPrice,
      cleaningType: requestData.cleaningType
    });

    // Check rate limiting after parsing booking data
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    logStep("Rate limiting check", { email: requestData.customerEmail, ip: clientIP });

    // Check if this email or IP is rate limited
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient
      .rpc('check_booking_rate_limit', {
        p_email: requestData.customerEmail,
        p_ip: clientIP
      });

    if (rateLimitError) {
      logStep("ERROR: Rate limit check failed", { error: rateLimitError });
      // Continue with booking - don't fail on rate limit check errors
    } else if (!rateLimitCheck) {
      logStep("ERROR: Rate limit exceeded", { email: requestData.customerEmail, ip: clientIP });
      throw new Error("Too many booking attempts. Please try again later.");
    }

    logStep("Rate limit check passed");
    logStep("Booking data received", { 
      customerEmail: requestData.customerEmail,
      serviceType: requestData.serviceType,
      totalPrice: requestData.totalPrice,
      cleaningType: requestData.cleaningType
    });

    // Validate required fields with enhanced security checks
    const requiredFields = [
      'customerName', 'customerEmail', 'customerPhone',
      'address', 'city', 'state', 'zipcode', 'beds', 'baths', 'sqft',
      'serviceType', 'startDate', 'frequency', 'totalPrice'
    ];
    
    for (const field of requiredFields) {
      if (!requestData[field]) {
        logStep("ERROR: Missing required field", { field });
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Enhanced input validation
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(requestData.customerEmail)) {
      logStep("ERROR: Invalid email format", { email: requestData.customerEmail });
      throw new Error("Invalid email address format");
    }

    if (requestData.customerName.trim().length < 2 || requestData.customerName.trim().length > 100) {
      logStep("ERROR: Invalid customer name", { name: requestData.customerName });
      throw new Error("Customer name must be between 2 and 100 characters");
    }

    if (requestData.totalPrice < 50 || requestData.totalPrice > 5000) {
      logStep("ERROR: Invalid price range", { price: requestData.totalPrice });
      throw new Error("Price must be between $50 and $5000");
    }

    if (requestData.beds < 1 || requestData.beds > 20 || requestData.baths < 1 || requestData.baths > 20) {
      logStep("ERROR: Invalid property specifications", { beds: requestData.beds, baths: requestData.baths });
      throw new Error("Invalid property specifications");
    }

    const bookingDate = new Date(requestData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      logStep("ERROR: Invalid booking date", { date: requestData.startDate });
      throw new Error("Booking date cannot be in the past");
    }

    logStep("All required fields and validations passed");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.customerEmail)) {
      logStep("ERROR: Invalid email format", { email: requestData.customerEmail });
      throw new Error(`Invalid email address: ${requestData.customerEmail}`);
    }

    // Additional security: Check for suspicious patterns
    const suspiciousPatterns = [
      /test@/i,
      /fake@/i,
      /spam@/i,
      /abuse@/i,
      /@temp/i,
      /@10minute/i,
      /@guerrilla/i
    ];

    const isSuspiciousEmail = suspiciousPatterns.some(pattern => pattern.test(requestData.customerEmail));
    if (isSuspiciousEmail) {
      logStep("WARNING: Suspicious email pattern detected", { email: requestData.customerEmail });
      // Log but don't block - might be legitimate
    }

    // Check if customer already exists
    const customers = await stripe.customers.list({ 
      email: requestData.customerEmail, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: requestData.customerEmail,
        name: requestData.customerName,
        phone: requestData.customerPhone,
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Determine payment mode based on cleaningType
    const isSubscription = requestData.cleaningType === "subscription";
    const checkoutMode = isSubscription ? "setup" : "payment";
    
    logStep("Payment mode determined", { 
      cleaningType: requestData.cleaningType, 
      isSubscription, 
      checkoutMode 
    });

    // Parse time and create proper job date
    const time24 = parseTime24Hour(requestData.startTime);
    const jobDateIso = `${requestData.startDate}T${time24}:00Z`;
    logStep("Job date parsed", { originalTime: requestData.startTime, time24, jobDateIso });

    // Insert booking into database with enhanced error handling
    let booking;
    try {
      const { data: bookingRecord, error: bookingError } = await supabaseClient
        .from("bookings")
        .insert({
          customer_name: requestData.customerName,
          customer_email: requestData.customerEmail,
          customer_phone: requestData.customerPhone,
          property_address: requestData.address,
          property_city: requestData.city,
          property_state: requestData.state,
          property_zipcode: requestData.zipcode,
          property_beds: requestData.beds,
          property_baths: requestData.baths,
          property_half_baths: requestData.halfBaths || 0,
          property_sqft: requestData.sqft,
          service_type: requestData.serviceType,
          cleaning_date: requestData.startDate,
          cleaning_time: requestData.startTime,
          subscription_months: requestData.months,
          deep_cleaning: requestData.addOns?.deepCleaning || false,
          laundry: requestData.addOns?.laundry || false,
          inside_fridge: requestData.addOns?.insideFridge || false,
          inside_windows: requestData.addOns?.insideWindows || false,
          cleaning_type: requestData.cleaningType,
          frequency: requestData.cleaningType === 'one-time' ? 'one-time' : requestData.frequency,
          base_price_cents: Math.round(requestData.basePrice * 100),
          total_price_cents: Math.round(requestData.totalPrice * 100),
          parking_info: requestData.parkingInfo,
          schedule_flexibility: requestData.scheduleFlexibility,
          access_method: requestData.accessMethod,
          special_instructions: requestData.specialInstructions,
          stripe_customer_id: customerId,
          payment_mode: isSubscription ? "subscription" : "one-time",
          payment_status: isSubscription ? "pending" : "processing",
          booking_status: "processing"
        })
        .select()
        .single();

      if (bookingError) {
        logStep("ERROR: Failed to create booking", { error: bookingError });
        if (bookingError.code === '23514') {
          // Check constraint violation - likely validation failed
          throw new Error("Booking data validation failed. Please check your information and try again.");
        }
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      booking = bookingRecord;
      logStep("Booking created successfully", { bookingId: booking.id });

    } catch (error) {
      logStep("ERROR: Booking creation failed", { error: error.message });
      if (error.message.includes('validation failed')) {
        throw new Error("The booking information provided does not meet our security requirements. Please verify your details and try again.");
      }
      throw error;
    }

    // Create job record using the helper function
    try {
      const { data: jobData, error: jobError } = await supabaseClient
        .from("jobs")
        .insert({
          booking_id: booking.id,
          date: jobDateIso,
          price_cents: Math.round(requestData.totalPrice * 100),
          payout_cents: Math.round(requestData.totalPrice * 100 * 0.7),
          city: requestData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${requestData.customerName} - ${requestData.address}`
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
          service_type: requestData.serviceType,
          frequency: requestData.frequency
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
          date: `${requestData.startDate}T${(requestData.startTime || '10:00')}:00Z`,
          price_cents: Math.round(requestData.totalPrice * 100),
          payout_cents: Math.round(requestData.totalPrice * 100 * 0.7),
          contractor_id: null,
          is_first_clean: true,
          city: requestData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${requestData.customerName} - ${requestData.address}`
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
              name: `${requestData.serviceType} - One Time Cleaning`,
              description: `${requestData.beds}BR/${requestData.baths}BA - ${requestData.address}, ${requestData.city}`
            },
            unit_amount: Math.round(requestData.totalPrice * 100)
          },
          quantity: 1
        }],
        success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${origin}/booking-cancelled?booking_id=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          service_type: requestData.serviceType,
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
          date: `${requestData.startDate}T${(requestData.startTime || '10:00')}:00Z`,
          price_cents: Math.round(requestData.totalPrice * 100),
          payout_cents: Math.round(requestData.totalPrice * 100 * 0.7),
          contractor_id: null,
          is_first_clean: true,
          city: requestData.city,
          status: 'New',
          notes: `Booking #${booking.id} - ${requestData.customerName} - ${requestData.address}`
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