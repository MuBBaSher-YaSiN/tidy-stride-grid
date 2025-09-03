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
  console.log(`[CREATE-BOOKING-CHECKOUT] ${timestamp} ${step}${detailsStr}`);
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
      frequency: bookingData.frequency,
      totalPrice: bookingData.totalPrice
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
        frequency: bookingData.frequency,
        base_price_cents: Math.round(bookingData.basePrice * 100),
        total_price_cents: Math.round(bookingData.totalPrice * 100),
        parking_info: bookingData.parkingInfo,
        schedule_flexibility: bookingData.scheduleFlexibility,
        access_method: bookingData.accessMethod,
        special_instructions: bookingData.specialInstructions,
        stripe_customer_id: customerId,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      logStep("ERROR: Failed to create booking", { error: bookingError });
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }
    logStep("Booking created in database", { bookingId: booking.id });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Determine if this is a subscription or one-time payment
    const isSubscription = bookingData.frequency !== 'one-time';
    
    if (isSubscription) {
      logStep("Creating setup session for subscription");
      
      // For subscriptions, we use setup mode to save payment method
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

      // Update booking with setup intent ID
      await supabaseClient
        .from("bookings")
        .update({ stripe_setup_intent_id: session.setup_intent })
        .eq("id", booking.id);

      logStep("Setup session created", { sessionId: session.id, url: session.url });
      
      return new Response(JSON.stringify({ 
        url: session.url,
        booking_id: booking.id,
        session_id: session.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Creating payment intent for one-time service");
      
      // For one-time payments, create a payment intent but don't charge immediately
      // We'll charge after service completion
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(bookingData.totalPrice * 100),
        currency: "usd",
        customer: customerId,
        setup_future_usage: "off_session", // Allow future payments if needed
        metadata: {
          booking_id: booking.id,
          service_type: bookingData.serviceType
        }
      });

      // Create checkout session for the payment intent
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "setup", // Use setup mode even for one-time to avoid immediate charge
        payment_method_types: ["card"],
        success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
        cancel_url: `${origin}/booking-cancelled?booking_id=${booking.id}`,
        metadata: {
          booking_id: booking.id,
          service_type: bookingData.serviceType,
          payment_intent_id: paymentIntent.id
        }
      });

      // Update booking with payment intent ID
      await supabaseClient
        .from("bookings")
        .update({ 
          stripe_payment_intent_id: paymentIntent.id,
          stripe_setup_intent_id: session.setup_intent
        })
        .eq("id", booking.id);

      logStep("Payment intent and session created", { 
        paymentIntentId: paymentIntent.id,
        sessionId: session.id,
        url: session.url
      });

      // Send booking confirmation email
      try {
        logStep("Attempting to send booking confirmation email");
        const emailPayload = {
          bookingData: {
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            serviceType: bookingData.serviceType,
            startDate: bookingData.startDate,
            startTime: bookingData.startTime,
            frequency: bookingData.frequency,
            address: bookingData.address,
            city: bookingData.city,
            state: bookingData.state,
            zipcode: bookingData.zipcode,
            beds: bookingData.beds,
            baths: bookingData.baths,
            sqft: bookingData.sqft,
            totalPrice: bookingData.totalPrice,
            addOns: bookingData.addOns,
            specialInstructions: bookingData.specialInstructions
          },
          bookingId: booking.id
        };

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify(emailPayload)
        });

        if (emailResponse.ok) {
          logStep("Confirmation email sent successfully");
        } else {
          const errorText = await emailResponse.text();
          logStep("WARNING: Failed to send confirmation email", { error: errorText, status: emailResponse.status });
        }
      } catch (emailError) {
        logStep("WARNING: Email sending failed", { error: emailError });
        // Don't fail the booking if email fails
      }
      
      return new Response(JSON.stringify({ 
        url: session.url,
        booking_id: booking.id,
        session_id: session.id,
        payment_intent_id: paymentIntent.id
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