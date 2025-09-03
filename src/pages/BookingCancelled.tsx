import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function BookingCancelled() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const loadBooking = async () => {
      if (!bookingId) {
        console.error("Missing booking_id in URL");
        toast({
          title: "Error",
          description: "Missing booking information.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      try {
        console.log("Loading cancelled booking:", bookingId);
        
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

        if (bookingError) {
          console.error("Error fetching booking:", bookingError);
          toast({
            title: "Error",
            description: "Could not load booking details.",
            variant: "destructive",
          });
        } else {
          setBooking(bookingData);
          console.log("Booking details loaded:", bookingData);
          
          // Update booking status to cancelled if not already
          if (bookingData.booking_status !== 'cancelled') {
            const { error: updateError } = await supabase
              .from("bookings")
              .update({ 
                booking_status: 'cancelled',
                payment_status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq("id", bookingId);

            if (updateError) {
              console.error("Error updating booking status:", updateError);
            } else {
              console.log("Booking status updated to cancelled");
            }
          }

          toast({
            title: "Booking Cancelled",
            description: "Your booking has been cancelled. No charges have been made.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading booking:", error);
        toast({
          title: "Loading Error",
          description: "There was an unexpected error loading your booking.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [bookingId, toast]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleRetryBooking = () => {
    // Redirect back to booking flow with pre-filled data if available
    const bookingParams = new URLSearchParams();
    if (booking) {
      bookingParams.set('retry', 'true');
      bookingParams.set('name', booking.customer_name);
      bookingParams.set('email', booking.customer_email);
      bookingParams.set('phone', booking.customer_phone);
    }
    window.location.href = `/book?${bookingParams.toString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
            <p className="text-center text-muted-foreground">
              Loading booking details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Booking Cancelled
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Your booking process was cancelled and no payment has been charged.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {booking && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Cancelled Booking Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Service Date:</strong> {formatDate(booking.cleaning_date)}</p>
                  <p><strong>Service Type:</strong> {booking.service_type.replace('_', ' ').toUpperCase()}</p>
                  <p><strong>Address:</strong> {booking.property_address}, {booking.property_city}, {booking.property_state}</p>
                  <p><strong>Total Cost:</strong> {formatCurrency(booking.total_price_cents)}</p>
                  <p className="text-green-600 font-medium">Status: No charges applied</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What Happened?</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• The payment process was cancelled before completion</li>
                <li>• No payment method was saved</li>
                <li>• No charges have been made to your card</li>
                <li>• Your booking reservation was not confirmed</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Ready to Try Again?</h3>
              <p className="text-sm text-green-800 mb-3">
                You can easily restart your booking process with the same details, or make any changes you need.
              </p>
              <Button onClick={handleRetryBooking} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Booking Again
              </Button>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Need Assistance?</h3>
              <p className="text-sm text-orange-800 mb-3">
                If you experienced any issues during checkout or have questions about our service:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href="mailto:support@cleannami.com" className="flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Support
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href="tel:+1-555-0123" className="flex items-center justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Us
                  </a>
                </Button>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">Why Choose CleanNami?</h3>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li>• Professional, trained, and insured cleaners</li>
                <li>• Flexible scheduling and easy rescheduling</li>
                <li>• Satisfaction guarantee on all services</li>
                <li>• Secure payment processing</li>
                <li>• No upfront charges - pay after service completion</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/" className="flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Home
                </Link>
              </Button>
              <Button onClick={handleRetryBooking} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Book Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}