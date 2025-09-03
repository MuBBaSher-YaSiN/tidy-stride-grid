import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Mail, ArrowLeft, Calendar, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !bookingId) {
        console.error("Missing session_id or booking_id in URL");
        toast({
          title: "Error",
          description: "Missing payment information. Please contact support.",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Verifying payment for booking:", bookingId, "session:", sessionId);
        
        // Verify payment with our edge function
        const { data, error } = await supabase.functions.invoke('verify-booking-payment', {
          body: {
            session_id: sessionId,
            booking_id: bookingId
          }
        });

        if (error) {
          console.error("Error verifying payment:", error);
          toast({
            title: "Payment Verification Failed",
            description: "There was an issue verifying your payment. Please contact support.",
            variant: "destructive",
          });
          setIsVerifying(false);
          return;
        }

        console.log("Payment verification result:", data);

        if (data.success) {
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
            
            toast({
              title: "Booking Confirmed!",
              description: "Your payment method has been set up successfully. You'll be charged after service completion.",
            });
          }
        } else {
          toast({
            title: "Payment Setup Failed",
            description: data.error || "There was an issue with your payment setup.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error in payment verification:", error);
        toast({
          title: "Verification Error",
          description: "There was an unexpected error. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, bookingId, toast]);

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

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-muted-foreground">
              Verifying your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Booking Confirmed!
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Your cleaning service has been successfully booked. Payment method is set up and you'll be charged after service completion.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {booking && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Service Details
                  </h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <p><strong>Date:</strong> {formatDate(booking.cleaning_date)}</p>
                    {booking.cleaning_time && (
                      <p><strong>Time:</strong> {booking.cleaning_time}</p>
                    )}
                    <p><strong>Service Type:</strong> {booking.service_type.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Frequency:</strong> {booking.frequency.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Property Address
                  </h3>
                  <div className="text-sm text-green-800">
                    <p>{booking.property_address}</p>
                    <p>{booking.property_city}, {booking.property_state} {booking.property_zipcode}</p>
                    <p>{booking.property_beds} bed, {booking.property_baths} bath, {booking.property_sqft} sq ft</p>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pricing
                  </h3>
                  <div className="text-sm text-purple-800">
                    <p><strong>Total Cost:</strong> {formatCurrency(booking.total_price_cents)}</p>
                    <p className="text-xs mt-1">
                      * You'll be charged after service completion
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">What Happens Next?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• You'll receive a confirmation email shortly</li>
                <li>• A cleaner will be assigned to your booking</li>
                <li>• You'll be contacted 24 hours before your scheduled cleaning</li>
                <li>• Payment will be processed automatically after service completion</li>
                {booking?.frequency !== 'one-time' && (
                  <li>• Future cleanings will be scheduled according to your selected frequency</li>
                )}
              </ul>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Important Information</h3>
              <ul className="space-y-2 text-sm text-orange-800">
                <li>• No upfront payment required - charges apply after service completion</li>
                <li>• You can modify or cancel your booking up to 24 hours in advance</li>
                <li>• Our cleaning service comes with a satisfaction guarantee</li>
                <li>• You'll receive email notifications for all upcoming cleanings</li>
              </ul>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">Need Help?</h3>
              <div className="space-y-3">
                <p className="text-sm text-indigo-800">
                  If you have any questions or need to make changes to your booking, contact us:
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/" className="flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Home
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to={`/booking-details/${bookingId}`} className="flex items-center justify-center">
                  View Booking Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}