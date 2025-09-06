import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Calendar, Home, User, Mail, Phone, MapPin, Plus, Clock } from "lucide-react";
import { calculatePrice, formatCurrency, FLORIDA_CITIES, US_STATES, EARLIEST_CLEAN_DATE, type FloridaCity, type USState } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type BookingStep = 'property' | 'service' | 'schedule' | 'contact' | 'payment' | 'addons' | 'frequency' | 'info';

interface BookingData {
  // Property details
  address1: string;
  address2: string;
  city: FloridaCity | '';
  state: USState | '';
  zipcode: string;
  beds: number;
  baths: number;
  halfBaths: number;
  sqft: number;
  
  // Service details  
  serviceType: 'Residential' | 'VR' | '';
  cleaningType: 'one-time' | 'subscription' | '';
  months: number;
  icalUrl?: string;
  
  // Schedule
  startDate: string;
  startTime: string;
  
  // Contact
  name: string;
  email: string;
  phone: string;
  
  // Add-ons
  addOns: {
    deepCleaning: boolean;
    laundry: boolean;
    insideFridge: boolean;
    insideWindows: boolean;
  };
  
  // Frequency
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'tri-weekly' | 'monthly';
  
  // Additional Info
  parking: string;
  flexibility: string;
  access: string;
  additionalNotes: string;
  
  // Pricing
  priceResult?: any;
}

const BookingFlow = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('property');
  const [bookingData, setBookingData] = useState<BookingData>({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipcode: '',
    beds: 1,
    baths: 1,
    halfBaths: 0,
    sqft: 800,
    serviceType: '',
    cleaningType: '',
    months: 3,
    startDate: '',
    startTime: '',
    name: '',
    email: '',
    phone: '',
    addOns: {
      deepCleaning: false,
      laundry: false,
      insideFridge: false,
      insideWindows: false,
    },
    frequency: 'one-time',
    parking: '',
    flexibility: '',
    access: '',
    additionalNotes: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const goToNextStep = () => {
    const steps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'addons', 'frequency', 'info', 'payment'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const steps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'addons', 'frequency', 'info', 'payment'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const calculateCurrentPrice = () => {
    return calculatePrice(
      bookingData.beds, 
      bookingData.baths, 
      bookingData.halfBaths,
      bookingData.sqft, 
      bookingData.addOns,
      bookingData.frequency
    );
  };

  const handleBookingSubmit = async () => {
    setIsLoading(true);
    console.log("Booking submission started", bookingData);
    
    try {
      const priceResult = calculateCurrentPrice();
      console.log("Price result:", priceResult);
      
      if (priceResult.isCustomQuote) {
        toast({
          title: "Custom Quote Request Submitted!",
          description: "We'll contact you within 24 hours with a custom quote for your property.",
        });
        
        setTimeout(() => {
          navigate("/booking-success");
        }, 2000);
        return;
      }

      // Create Stripe checkout
      const bookingPayload = {
        customerName: bookingData.name,
        customerEmail: bookingData.email,
        customerPhone: bookingData.phone,
        address: bookingData.address1,
        city: bookingData.city,
        state: bookingData.state,
        zipcode: bookingData.zipcode,
        beds: bookingData.beds,
        baths: bookingData.baths,
        halfBaths: bookingData.halfBaths,
        sqft: bookingData.sqft,
        serviceType: bookingData.serviceType,
        startDate: bookingData.startDate,
        startTime: bookingData.startTime,
        months: bookingData.months,
        addOns: bookingData.addOns,
        frequency: bookingData.frequency,
        basePrice: priceResult.price,
        totalPrice: priceResult.price,
        parkingInfo: bookingData.parking,
        scheduleFlexibility: bookingData.flexibility,
        accessMethod: bookingData.access,
        specialInstructions: bookingData.additionalNotes
      };

      console.log('Starting booking submission...');
      console.log('Booking payload:', JSON.stringify(bookingPayload, null, 2));
      
      const { data, error } = await supabase.functions.invoke('create-booking-checkout', {
        body: bookingPayload
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      if (!data) {
        console.error('No data received from edge function');
        throw new Error('No response data received');
      }
      
      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        console.log('About to redirect, current URL:', window.location.href);
        
        // Add a small delay to ensure state is updated before redirect
        setTimeout(() => {
          console.log('Executing redirect to:', data.url);
          window.location.href = data.url;
        }, 100);
      } else {
        console.error('No checkout URL in response:', data);
        throw new Error('No checkout URL received from payment processor');
      }
      
    } catch (error) {
      console.error('Booking submission error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        type: typeof error,
        errorObj: error
      });
      
      try {
        toast({
          title: "Booking Failed",
          description: error instanceof Error ? error.message : "There was an error processing your booking. Please try again.",
          variant: "destructive",
        });
      } catch (toastError) {
        console.error('Toast error:', toastError);
        // Fallback: use alert if toast fails
        alert('Booking failed: ' + (error instanceof Error ? error.message : "There was an error processing your booking. Please try again."));
      }
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const renderPropertyStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <Home className="h-5 w-5 mr-2" />
          Property Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="beds">Bedrooms</Label>
            <Select value={bookingData.beds.toString()} onValueChange={(value) => updateBookingData({ beds: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="baths">Bathrooms</Label>
            <Select value={bookingData.baths.toString()} onValueChange={(value) => updateBookingData({ baths: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="halfBaths">Half Bathrooms</Label>
            <Select value={bookingData.halfBaths.toString()} onValueChange={(value) => updateBookingData({ halfBaths: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sqft">Square Footage</Label>
          <Input
            id="sqft"
            type="number"
            value={bookingData.sqft}
            onChange={(e) => updateBookingData({ sqft: parseInt(e.target.value) || 0 })}
            placeholder="Enter square footage"
            min="500"
            max="5000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address1">Street Address</Label>
          <Input
            id="address1"
            value={bookingData.address1}
            onChange={(e) => updateBookingData({ address1: e.target.value })}
            placeholder="123 Main Street"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address2">Apartment/Suite (Optional)</Label>
          <Input
            id="address2"
            value={bookingData.address2}
            onChange={(e) => updateBookingData({ address2: e.target.value })}
            placeholder="Apt 4B"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select value={bookingData.state} onValueChange={(value: USState) => updateBookingData({ state: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select value={bookingData.city} onValueChange={(value: FloridaCity) => updateBookingData({ city: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {FLORIDA_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zipcode">ZIP Code</Label>
            <Input
              id="zipcode"
              value={bookingData.zipcode}
              onChange={(e) => updateBookingData({ zipcode: e.target.value })}
              placeholder="32169"
              maxLength={5}
            />
          </div>
        </div>

        {/* Price Preview */}
        {bookingData.beds && bookingData.baths && bookingData.sqft && (
          <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
            <div className="text-center">
              {(() => {
                const result = calculateCurrentPrice();
                return result.isCustomQuote ? (
                  <div>
                    <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                    <p className="text-sm text-muted-foreground">Properties over 3,000 sq ft require a custom quote</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(result.price * 100)}</p>
                    <p className="text-sm text-muted-foreground">per cleaning</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderServiceStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="text-primary">Service Type & Duration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Service Type</Label>
          <RadioGroup 
            value={bookingData.serviceType} 
            onValueChange={(value: 'Residential' | 'VR') => updateBookingData({ serviceType: value })}
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="Residential" id="residential" />
              <div className="flex-1">
                <Label htmlFor="residential" className="cursor-pointer">
                  <div className="font-medium">Residential Cleaning</div>
                  <div className="text-sm text-muted-foreground">Regular cleaning for your home</div>
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="VR" id="vr" />
              <div className="flex-1">
                <Label htmlFor="vr" className="cursor-pointer">
                  <div className="font-medium">Vacation Rental Cleaning</div>
                  <div className="text-sm text-muted-foreground">Automated turnover cleaning</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {bookingData.serviceType === 'VR' && (
          <div className="space-y-2">
            <Label htmlFor="icalUrl">iCal URL </Label>
            <Input
              id="icalUrl"
              value={bookingData.icalUrl || ''}
              onChange={(e) => updateBookingData({ icalUrl: e.target.value })}
              placeholder="https://www.airbnb.com/calendar/ical/..."
            required
            />
            <p className="text-sm text-muted-foreground">
              Connect your Airbnb/VRBO calendar for automatic scheduling
            </p>
          </div>
        )}

        <div className="space-y-4">
          <Label>Cleaning Option</Label>
          <RadioGroup 
            value={bookingData.cleaningType} 
            onValueChange={(value: 'one-time' | 'subscription') => {
              updateBookingData({ 
                cleaningType: value,
        frequency: value === 'one-time' ? 'one-time' : 'weekly'
              });
            }}
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="one-time" id="one-time-cleaning" />
              <div className="flex-1">
                <Label htmlFor="one-time-cleaning" className="cursor-pointer">
                  <div className="font-medium">One-Time Cleaning</div>
                  <div className="text-sm text-muted-foreground">Single cleaning service with immediate payment</div>
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="subscription" id="subscription-cleaning" />
              <div className="flex-1">
                <Label htmlFor="subscription-cleaning" className="cursor-pointer">
                  <div className="font-medium">Subscription Cleaning</div>
                  <div className="text-sm text-muted-foreground">Recurring service with payment per completed job</div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {bookingData.cleaningType === 'subscription' && (
          <div className="space-y-2">
            <Label htmlFor="months">Subscription Length</Label>
            <Select value={bookingData.months.toString()} onValueChange={(value) => updateBookingData({ months: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="2">2 Months</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="4">4 Months</SelectItem>
                <SelectItem value="5">5 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderScheduleStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <Calendar className="h-5 w-5 mr-2" />
          Schedule Your First Cleaning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Preferred Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={bookingData.startDate}
              onChange={(e) => updateBookingData({ startDate: e.target.value })}
              min={EARLIEST_CLEAN_DATE}
              required
            />
            <p className="text-sm text-muted-foreground">
              Earliest available date: {EARLIEST_CLEAN_DATE}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Preferred Time</Label>
            <Select value={bookingData.startTime} onValueChange={(value) => updateBookingData({ startTime: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8:00 AM">8:00 AM</SelectItem>
                <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                <SelectItem value="5:00 PM">5:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 bg-gradient-hero rounded-lg">
          <h4 className="font-semibold text-primary mb-2">What to Expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Deep cleaning on your first visit</li>
            <li>• Professional, insured cleaners</li>
            <li>• Recurring service based on subscription length</li>
            <li>• First cleaning charged at booking, future cleanings charged after completion</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderContactStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <User className="h-5 w-5 mr-2" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={bookingData.name}
            onChange={(e) => updateBookingData({ name: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={bookingData.email}
            onChange={(e) => updateBookingData({ email: e.target.value })}
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={bookingData.phone}
            onChange={(e) => updateBookingData({ phone: e.target.value })}
            placeholder="(555) 123-4567"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms" className="text-sm">
            I agree to the Terms of Service and Privacy Policy
          </Label>
        </div>
      </CardContent>
    </Card>
  );

  const renderAddOnsStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <Plus className="h-5 w-5 mr-2" />
          Select Add-Ons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="deepCleaning"
                checked={bookingData.addOns.deepCleaning}
                onCheckedChange={(checked) => 
                  updateBookingData({ 
                    addOns: { ...bookingData.addOns, deepCleaning: checked as boolean }
                  })
                }
              />
              <div>
                <Label htmlFor="deepCleaning" className="font-medium cursor-pointer">Deep Cleaning</Label>
                <p className="text-sm text-muted-foreground">Detailed cleaning for a thorough clean</p>
              </div>
            </div>
            <span className="font-semibold text-primary">+$30</span>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="laundry"
                checked={bookingData.addOns.laundry}
                onCheckedChange={(checked) => 
                  updateBookingData({ 
                    addOns: { ...bookingData.addOns, laundry: checked as boolean }
                  })
                }
              />
              <div>
                <Label htmlFor="laundry" className="font-medium cursor-pointer">Laundry</Label>
                <p className="text-sm text-muted-foreground">Wash, dry, and fold your laundry</p>
              </div>
            </div>
            <span className="font-semibold text-primary">+$9</span>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="insideFridge"
                checked={bookingData.addOns.insideFridge}
                onCheckedChange={(checked) => 
                  updateBookingData({ 
                    addOns: { ...bookingData.addOns, insideFridge: checked as boolean }
                  })
                }
              />
              <div>
                <Label htmlFor="insideFridge" className="font-medium cursor-pointer">Inside the Fridge</Label>
                <p className="text-sm text-muted-foreground">Clean inside your refrigerator</p>
              </div>
            </div>
            <span className="font-semibold text-primary">+$15</span>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="insideWindows"
                checked={bookingData.addOns.insideWindows}
                onCheckedChange={(checked) => 
                  updateBookingData({ 
                    addOns: { ...bookingData.addOns, insideWindows: checked as boolean }
                  })
                }
              />
              <div>
                <Label htmlFor="insideWindows" className="font-medium cursor-pointer">Inside Windows</Label>
                <p className="text-sm text-muted-foreground">Clean interior window surfaces</p>
              </div>
            </div>
            <span className="font-semibold text-primary">+$10</span>
          </div>
        </div>

        {/* Price Preview */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          <div className="text-center">
            {(() => {
              const result = calculateCurrentPrice();
              return result.isCustomQuote ? (
                <div>
                  <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                  <p className="text-sm text-muted-foreground">Properties over 3,000 sq ft require a custom quote</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(result.price * 100)}</p>
                  <p className="text-sm text-muted-foreground">per cleaning</p>
                </div>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFrequencyStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <Clock className="h-5 w-5 mr-2" />
          How Often?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <RadioGroup 
            value={bookingData.frequency} 
            onValueChange={(value: BookingData['frequency']) => updateBookingData({ frequency: value })}
          >
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="one-time" id="one-time" />
                <div>
                  <Label htmlFor="one-time" className="font-medium cursor-pointer">One Time</Label>
                  <p className="text-sm text-muted-foreground">Single cleaning service</p>
                </div>
              </div>
              <span className="font-semibold text-muted-foreground">No discount</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="weekly" id="weekly" />
                <div>
                  <Label htmlFor="weekly" className="font-medium cursor-pointer">Every Week</Label>
                  <p className="text-sm text-muted-foreground">Weekly cleaning service</p>
                </div>
              </div>
              <span className="font-semibold text-green-600">15% off</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="bi-weekly" id="bi-weekly" />
                <div>
                  <Label htmlFor="bi-weekly" className="font-medium cursor-pointer">Every 2 Weeks</Label>
                  <p className="text-sm text-muted-foreground">Bi-weekly cleaning service</p>
                </div>
              </div>
              <span className="font-semibold text-green-600">10% off</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="tri-weekly" id="tri-weekly" />
                <div>
                  <Label htmlFor="tri-weekly" className="font-medium cursor-pointer">Every 3 Weeks</Label>
                  <p className="text-sm text-muted-foreground">Tri-weekly cleaning service</p>
                </div>
              </div>
              <span className="font-semibold text-green-600">5% off</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="monthly" id="monthly" />
                <div>
                  <Label htmlFor="monthly" className="font-medium cursor-pointer">Every 4 Weeks</Label>
                  <p className="text-sm text-muted-foreground">Monthly cleaning service</p>
                </div>
              </div>
              <span className="font-semibold text-green-600">5% off</span>
            </div>
          </RadioGroup>
        </div>

        {/* Price Preview */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          <div className="text-center">
            {(() => {
              const result = calculateCurrentPrice();
              return result.isCustomQuote ? (
                <div>
                  <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                  <p className="text-sm text-muted-foreground">Properties over 3,000 sq ft require a custom quote</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(result.price * 100)}</p>
                  <p className="text-sm text-muted-foreground">per cleaning</p>
                  {result.breakdown.discount > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      You save {formatCurrency(result.breakdown.discount * 100)} per cleaning!
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAdditionalInfoStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <MapPin className="h-5 w-5 mr-2" />
          Additional Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Where can your cleaners park? *</Label>
          <RadioGroup 
            value={bookingData.parking} 
            onValueChange={(value) => updateBookingData({ parking: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="street" id="street" />
              <Label htmlFor="street" className="cursor-pointer">Street parking</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="driveway" id="driveway" />
              <Label htmlFor="driveway" className="cursor-pointer">Driveway</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="garage" id="garage" />
              <Label htmlFor="garage" className="cursor-pointer">Garage</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="parking-lot" id="parking-lot" />
              <Label htmlFor="parking-lot" className="cursor-pointer">Parking lot</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no-parking" id="no-parking" />
              <Label htmlFor="no-parking" className="cursor-pointer">No parking available</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Is your day/time flexible? *</Label>
          <RadioGroup 
            value={bookingData.flexibility} 
            onValueChange={(value) => updateBookingData({ flexibility: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exact" id="exact" />
              <Label htmlFor="exact" className="cursor-pointer">No, I need the exact day/time</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="flexible" id="flexible" />
              <Label htmlFor="flexible" className="cursor-pointer">Yes, my schedule is flexible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="somewhat" id="somewhat" />
              <Label htmlFor="somewhat" className="cursor-pointer">Somewhat flexible (+/- 2 hours)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>How can your cleaners get inside your home? *</Label>
          <RadioGroup 
            value={bookingData.access} 
            onValueChange={(value) => updateBookingData({ access: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="home" id="home" />
              <Label htmlFor="home" className="cursor-pointer">I will be home</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="doorman" id="doorman" />
              <Label htmlFor="doorman" className="cursor-pointer">Doorman</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lockbox" id="lockbox" />
              <Label htmlFor="lockbox" className="cursor-pointer">Key in lockbox</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="smart-lock" id="smart-lock" />
              <Label htmlFor="smart-lock" className="cursor-pointer">Smart lock code</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hide-key" id="hide-key" />
              <Label htmlFor="hide-key" className="cursor-pointer">Hide key somewhere</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="neighbor" id="neighbor" />
              <Label htmlFor="neighbor" className="cursor-pointer">Neighbor/friend will let them in</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalNotes">Anything else your cleaners should know about?</Label>
          <Textarea
            id="additionalNotes"
            value={bookingData.additionalNotes}
            onChange={(e) => updateBookingData({ additionalNotes: e.target.value })}
            placeholder="Please let us know about pets, special instructions, areas to focus on, or anything else that would help our cleaners do their best work..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => {
    const priceResult = calculateCurrentPrice();
    
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-primary">Review & Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Summary */}
          <div className="p-4 bg-gradient-hero rounded-lg">
            <h4 className="font-semibold text-primary mb-4">Booking Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Property:</span>
                <span>{bookingData.address1}, {bookingData.city}, {bookingData.state}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{bookingData.beds} bed, {bookingData.baths} bath, {bookingData.halfBaths} half bath, {bookingData.sqft} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span>Service:</span>
                <span>{bookingData.serviceType} ({bookingData.months} months)</span>
              </div>
              <div className="flex justify-between">
                <span>Schedule:</span>
                <span>{bookingData.startDate} at {bookingData.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Frequency:</span>
                <span>{bookingData.frequency.replace('-', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-secondary/20 rounded-lg">
            <h4 className="font-semibold text-primary mb-4">Pricing</h4>
            {priceResult.isCustomQuote ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                <p className="text-sm text-muted-foreground">We'll contact you with a custom quote</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>{formatCurrency(priceResult.breakdown.basePrice * 100)}</span>
                </div>
                {priceResult.breakdown.sqftSurcharge > 0 && (
                  <div className="flex justify-between">
                    <span>Size Surcharge:</span>
                    <span>{formatCurrency(priceResult.breakdown.sqftSurcharge * 100)}</span>
                  </div>
                )}
                {priceResult.breakdown.addOnsPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons:</span>
                    <span>{formatCurrency(priceResult.breakdown.addOnsPrice * 100)}</span>
                  </div>
                )}
                {priceResult.breakdown.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Frequency Discount:</span>
                    <span>-{formatCurrency(priceResult.breakdown.discount * 100)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total per cleaning:</span>
                  <span className="text-primary">{formatCurrency(priceResult.price * 100)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  First cleaning charged today, future cleanings charged after completion
                </p>
              </div>
            )}
          </div>

          <CleanNamiButton 
            variant="hero" 
            size="lg" 
            className="w-full"
            onClick={handleBookingSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : priceResult.isCustomQuote ? "Request Custom Quote" : `Pay ${formatCurrency(priceResult.price * 100)} & Book`}
          </CleanNamiButton>
        </CardContent>
      </Card>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'property': return renderPropertyStep();
      case 'service': return renderServiceStep();
      case 'schedule': return renderScheduleStep();
      case 'contact': return renderContactStep();
      case 'addons': return renderAddOnsStep();
      case 'frequency': return renderFrequencyStep();
      case 'info': return renderAdditionalInfoStep();
      case 'payment': return renderPaymentStep();
      default: return renderPropertyStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'property':
        return bookingData.address1 && bookingData.city && bookingData.state && bookingData.zipcode && bookingData.beds && bookingData.baths && bookingData.sqft;
      case 'service':
        return bookingData.serviceType && bookingData.months;
      case 'schedule':
        return bookingData.startDate && bookingData.startTime;
      case 'contact':
        return bookingData.name && bookingData.email && bookingData.phone;
      case 'addons':
        return true; // Add-ons are optional
      case 'frequency':
        return bookingData.frequency;
      case 'info':
        return bookingData.parking && bookingData.flexibility && bookingData.access;
      case 'payment':
        return true;
      default:
        return false;
    }
  };

  const steps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'addons', 'frequency', 'info', 'payment'];
  const stepNames = ['Property', 'Service', 'Schedule', 'Contact', 'Add-ons', 'Frequency', 'Info', 'Payment'];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <div className="bg-card shadow-card border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-primary hover:text-primary/80">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">Book Your Cleaning</h1>
              <p className="text-sm text-muted-foreground">Step {steps.indexOf(currentStep) + 1} of {steps.length}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                steps.indexOf(currentStep) >= index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${
                  steps.indexOf(currentStep) > index
                    ? 'bg-primary'
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 pb-6">
        {renderCurrentStep()}
        
        {/* Navigation Buttons */}
        {currentStep !== 'payment' && (
          <div className="flex justify-between mt-6">
            <CleanNamiButton 
              variant="ghost" 
              onClick={goToPrevStep}
              disabled={currentStep === 'property'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </CleanNamiButton>
            
            <CleanNamiButton 
              variant="hero" 
              onClick={goToNextStep}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </CleanNamiButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingFlow;