import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, DollarSign, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function BookingDetails() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return;

      try {
        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingError) {
          console.error("Error fetching booking:", bookingError);
          toast({
            title: "Error",
            description: "Could not load booking details.",
            variant: "destructive",
          });
          return;
        }

        setBooking(bookingData);

        // Fetch related jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("booking_id", bookingId)
          .order("date", { ascending: true });

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
        } else {
          setJobs(jobsData || []);
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-center text-muted-foreground">
              Loading booking details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6">
            <p className="text-center text-muted-foreground mb-4">
              Booking not found
            </p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card className="shadow-lg border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Booking Details
            </CardTitle>
            <p className="text-muted-foreground">Booking ID: {booking.id}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Customer Information
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Name:</strong> {booking.customer_name}</p>
                  <p><strong>Email:</strong> {booking.customer_email}</p>
                  <p><strong>Phone:</strong> {booking.customer_phone}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Property Details
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  <p><strong>Address:</strong> {booking.property_address}</p>
                  <p><strong>City:</strong> {booking.property_city}, {booking.property_state} {booking.property_zipcode}</p>
                  <p><strong>Size:</strong> {booking.property_beds} bed, {booking.property_baths} bath, {booking.property_sqft} sq ft</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Service Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-800">
                <div>
                  <p><strong>Service Type:</strong> {booking.service_type.replace('_', ' ').toUpperCase()}</p>
                  <p><strong>Frequency:</strong> {booking.frequency.replace('_', ' ')}</p>
                  <p><strong>Date:</strong> {formatDate(booking.cleaning_date)}</p>
                  {booking.cleaning_time && (
                    <p><strong>Time:</strong> {booking.cleaning_time}</p>
                  )}
                </div>
                <div>
                  <p><strong>Deep Cleaning:</strong> {booking.deep_cleaning ? 'Yes' : 'No'}</p>
                  <p><strong>Laundry:</strong> {booking.laundry ? 'Yes' : 'No'}</p>
                  <p><strong>Inside Fridge:</strong> {booking.inside_fridge ? 'Yes' : 'No'}</p>
                  <p><strong>Inside Windows:</strong> {booking.inside_windows ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Payment Information
              </h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p><strong>Total Cost:</strong> {formatCurrency(booking.total_price_cents)}</p>
                <p><strong>Payment Mode:</strong> {booking.payment_mode}</p>
                <p><strong>Payment Status:</strong> {booking.payment_status}</p>
                <p><strong>Booking Status:</strong> {booking.booking_status}</p>
              </div>
            </div>

            {booking.ical_urls && booking.ical_urls.length > 0 && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="font-semibold text-indigo-900 mb-2">iCal Integration</h3>
                <div className="space-y-2 text-sm text-indigo-800">
                  <p><strong>iCal URLs:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    {booking.ical_urls.map((url: string, index: number) => (
                      <li key={index} className="break-all">{url}</li>
                    ))}
                  </ul>
                  <p><strong>Last Sync:</strong> {booking.last_ical_sync ? formatDateTime(booking.last_ical_sync) : 'Never'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {jobs.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Related Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">Job #{job.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(job.date)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        job.status === 'New' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'Claimed' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                        job.status === 'Submitted' ? 'bg-purple-100 text-purple-800' :
                        job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Price:</strong> {formatCurrency(job.price_cents)} | 
                      <strong> Payout:</strong> {formatCurrency(job.payout_cents)} | 
                      <strong> City:</strong> {job.city}
                    </p>
                    {job.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Notes:</strong> {job.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}