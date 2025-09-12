import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  description?: string;
}

interface Booking {
  id: string;
  ical_urls: string[];
  property_address: string;
  property_city: string;
  total_price_cents: number;
  service_type: string;
  deep_cleaning: boolean;
  laundry: boolean;
  inside_fridge: boolean;
  inside_windows: boolean;
  subscription_months: number;
}

function logStep(step: string, data?: any) {
  console.log(`[iCal-Poll] ${step}`, data ? JSON.stringify(data, null, 2) : '');
}

// Simple iCal parser for checkout events
function parseICalData(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalData.split('\n').map(line => line.trim());
  
  let currentEvent: Partial<ICalEvent> = {};
  let inEvent = false;
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent as ICalEvent);
      }
      inEvent = false;
      currentEvent = {};
    } else if (inEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      switch (key) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = value;
          break;
        case 'DESCRIPTION':
          currentEvent.description = value;
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICalDate(value);
          break;
        case 'DTEND':
          currentEvent.dtend = parseICalDate(value);
          break;
      }
    }
  }
  
  return events;
}

function parseICalDate(dateStr: string): Date {
  // Handle different iCal date formats
  if (dateStr.includes('T')) {
    // Format: 20241201T140000Z or 20241201T140000
    const cleanDate = dateStr.replace(/[TZ]/g, '');
    const year = parseInt(cleanDate.substr(0, 4));
    const month = parseInt(cleanDate.substr(4, 2)) - 1; // JS months are 0-indexed
    const day = parseInt(cleanDate.substr(6, 2));
    const hour = parseInt(cleanDate.substr(8, 2) || '0');
    const minute = parseInt(cleanDate.substr(10, 2) || '0');
    const second = parseInt(cleanDate.substr(12, 2) || '0');
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    // Format: 20241201 (date only)
    const year = parseInt(dateStr.substr(0, 4));
    const month = parseInt(dateStr.substr(4, 2)) - 1;
    const day = parseInt(dateStr.substr(6, 2));
    
    return new Date(Date.UTC(year, month, day));
  }
}

async function fetchICalData(url: string): Promise<ICalEvent[]> {
  try {
    // Handle test URLs with mock data
    if (url.includes('test-ical') || url.includes('dummy')) {
      logStep('Using test iCal data for', { url });
      return createTestICalEvents();
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CleanNami-iCal-Poller/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const icalData = await response.text();
    return parseICalData(icalData);
  } catch (error) {
    logStep(`Failed to fetch iCal from ${url}`, { error: error.message });
    return [];
  }
}

// Create test events for testing purposes
function createTestICalEvents(): ICalEvent[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return [
    {
      uid: 'test-checkout-1@cleannami.com',
      summary: 'Test Guest Checkout - Room A',
      dtstart: new Date(tomorrow.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago checkin
      dtend: tomorrow, // tomorrow checkout
      description: 'Test checkout event for testing job creation'
    },
    {
      uid: 'test-checkout-2@cleannami.com', 
      summary: 'Test Guest Checkout - Room B',
      dtstart: new Date(nextWeek.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before checkin
      dtend: nextWeek, // next week checkout
      description: 'Another test checkout event'
    }
  ];
}

async function createJobFromEvent(
  supabase: any,
  booking: Booking,
  event: ICalEvent
): Promise<string | null> {
  try {
    logStep('Creating job from event', { 
      booking_id: booking.id, 
      event_uid: event.uid,
      checkout_date: event.dtend 
    });
    
    const checkoutDate = event.dtend;
    
    // Calculate payout (70% of total price)
    const payoutCents = Math.round(booking.total_price_cents * 0.7);
    
    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        booking_id: booking.id,
        date: checkoutDate,
        price_cents: booking.total_price_cents,
        payout_cents: payoutCents,
        city: booking.property_city,
        status: 'New',
        notes: `Auto-created from iCal - ${event.summary || 'Guest checkout'} - ${booking.property_address}`
      })
      .select()
      .single();
      
    if (jobError) {
      logStep('Failed to create job', { error: jobError });
      return null;
    }
    
    logStep('Job created successfully', { job_id: job.id });
    return job.id;
  } catch (error) {
    logStep('Error creating job', { error: error.message });
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting iCal polling process');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all confirmed/active bookings with iCal URLs
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .not('ical_urls', 'is', null)
      .neq('ical_urls', '{}')
      .in('booking_status', ['active', 'confirmed'])
      .in('payment_status', ['completed', 'setup_complete']);
    
    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }
    
    logStep('Found bookings with iCal URLs', { count: bookings?.length || 0 });
    
    let totalEventsProcessed = 0;
    let totalJobsCreated = 0;
    
    for (const booking of bookings || []) {
      logStep('Processing booking', { booking_id: booking.id, ical_urls: booking.ical_urls });
      
      for (const icalUrl of booking.ical_urls || []) {
        try {
          const events = await fetchICalData(icalUrl);
          logStep('Fetched events from iCal', { url: icalUrl, event_count: events.length });
          
          // Filter for future checkout events (events ending today or later)
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          const futureCheckouts = events.filter(event => {
            const checkoutDate = new Date(event.dtend.getFullYear(), event.dtend.getMonth(), event.dtend.getDate());
            return checkoutDate >= today;
          });
          
          logStep('Future checkout events found', { count: futureCheckouts.length });
          
          for (const event of futureCheckouts) {
            totalEventsProcessed++;
            
            const checkoutDate = event.dtend.toISOString().split('T')[0];
            
            // Check if we already processed this event
            const { data: existingEvent } = await supabase
              .from('ical_events')
              .select('id, job_created, job_id')
              .eq('booking_id', booking.id)
              .eq('event_uid', event.uid)
              .eq('event_end', event.dtend.toISOString())
              .single();
              
            if (existingEvent?.job_created) {
              logStep('Event already processed, skipping', { event_uid: event.uid });
              continue;
            }
            
            // Insert/update the iCal event record
            const { error: eventError } = await supabase
              .from('ical_events')
              .upsert({
                booking_id: booking.id,
                event_uid: event.uid,
                event_start: event.dtstart.toISOString(),
                event_end: event.dtend.toISOString(),
                event_summary: event.summary,
                checkout_date: checkoutDate,
                job_created: false
              });
              
            if (eventError) {
              logStep('Failed to insert iCal event', { error: eventError });
              continue;
            }
            
            // Create the job
            const jobId = await createJobFromEvent(supabase, booking, event);
            
            if (jobId) {
              // Mark the event as processed
              await supabase
                .from('ical_events')
                .update({ job_created: true, job_id: jobId })
                .eq('booking_id', booking.id)
                .eq('event_uid', event.uid)
                .eq('event_end', event.dtend.toISOString());
                
              totalJobsCreated++;
              logStep('Job created and event marked as processed', { job_id: jobId });
            }
          }
        } catch (error) {
          logStep('Error processing iCal URL', { url: icalUrl, error: error.message });
          continue;
        }
      }
      
      // Update last sync time for this booking
      await supabase
        .from('bookings')
        .update({ last_ical_sync: new Date().toISOString() })
        .eq('id', booking.id);
    }
    
    const result = {
      success: true,
      bookings_processed: bookings?.length || 0,
      events_processed: totalEventsProcessed,
      jobs_created: totalJobsCreated,
      timestamp: new Date().toISOString()
    };
    
    logStep('iCal polling completed', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    logStep('Error in iCal polling function', { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});