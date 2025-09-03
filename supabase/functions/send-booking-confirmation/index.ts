import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BOOKING-CONFIRMATION] ${timestamp} ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      logStep("ERROR: BREVO_API_KEY not found");
      throw new Error("Brevo API key not configured");
    }

    const { bookingData, bookingId } = await req.json();
    logStep("Request received", { bookingId, customerEmail: bookingData.customerEmail });

    if (!bookingData || !bookingId) {
      logStep("ERROR: Missing required parameters");
      throw new Error("Missing booking data or booking ID");
    }

    // Format the email content
    const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const emailData = {
      sender: {
        name: "CleanPro Services",
        email: "booking@cleanpro.com"
      },
      to: [
        {
          email: bookingData.customerEmail,
          name: bookingData.customerName
        }
      ],
      subject: "Booking Confirmation - CleanPro Services",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing CleanPro Services</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #667eea; margin-top: 0;">Booking Details</h2>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Service Type:</strong> ${bookingData.serviceType}</p>
            <p><strong>Date:</strong> ${formatDate(bookingData.startDate)}</p>
            <p><strong>Time:</strong> ${bookingData.startTime || 'To be scheduled'}</p>
            <p><strong>Frequency:</strong> ${bookingData.frequency}</p>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #667eea; margin-top: 0;">Property Information</h2>
            <p><strong>Address:</strong> ${bookingData.address}, ${bookingData.city}, ${bookingData.state} ${bookingData.zipcode}</p>
            <p><strong>Property Size:</strong> ${bookingData.beds} beds, ${bookingData.baths} baths, ${bookingData.sqft} sq ft</p>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #667eea; margin-top: 0;">Service Summary</h2>
            <p><strong>Base Price:</strong> ${formatCurrency(bookingData.totalPrice)}</p>
            ${bookingData.addOns?.deepCleaning ? '<p>✓ Deep Cleaning</p>' : ''}
            ${bookingData.addOns?.laundry ? '<p>✓ Laundry Service</p>' : ''}
            ${bookingData.addOns?.insideFridge ? '<p>✓ Inside Fridge Cleaning</p>' : ''}
            ${bookingData.addOns?.insideWindows ? '<p>✓ Inside Windows Cleaning</p>' : ''}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
            <p style="font-size: 18px; font-weight: bold; color: #667eea;">Total: ${formatCurrency(bookingData.totalPrice)}</p>
          </div>

          <div style="background: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1976d2; margin-top: 0;">What Happens Next?</h2>
            <ul style="padding-left: 20px;">
              <li>You'll receive a confirmation call within 24 hours</li>
              <li>Our team will arrive on the scheduled date and time</li>
              <li>Payment will be processed after service completion</li>
              <li>You'll receive a service completion notification</li>
            </ul>
          </div>

          ${bookingData.specialInstructions ? `
          <div style="background: #fff3e0; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #f57f17; margin-top: 0;">Special Instructions</h2>
            <p>${bookingData.specialInstructions}</p>
          </div>
          ` : ''}

          <div style="background: #f1f8e9; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #388e3c; margin-top: 0;">Need Help?</h2>
            <p>If you have any questions or need to modify your booking, please contact us:</p>
            <p><strong>Phone:</strong> (555) 123-4567</p>
            <p><strong>Email:</strong> support@cleanpro.com</p>
            <p><strong>Hours:</strong> Mon-Fri 8AM-6PM, Sat 9AM-4PM</p>
          </div>

          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
            <p>Thank you for choosing CleanPro Services!</p>
            <p>&copy; 2024 CleanPro Services. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    logStep("Sending email via Brevo API", { recipientEmail: bookingData.customerEmail });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      logStep("ERROR: Brevo API request failed", { status: response.status, error: errorData });
      throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    logStep("Email sent successfully", { messageId: result.messageId });

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      recipient: bookingData.customerEmail
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-booking-confirmation", { message: errorMessage });
    
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