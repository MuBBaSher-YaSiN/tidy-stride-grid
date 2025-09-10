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
import { ArrowLeft, ArrowRight, Calendar, Home, User, Mail, Phone, MapPin, Plus, Clock, Upload } from "lucide-react";
import { calculatePrice, formatCurrency, FLORIDA_CITIES, EARLIEST_CLEAN_DATE, type FloridaCity } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type BookingStep = 'property' | 'service' | 'schedule' | 'contact' | 'payment' | 'addons' | 'frequency' | 'info';

interface BookingData {
  // Property details
  address1: string;
  address2: string;
  city: FloridaCity | '';
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
  checkoutTime?: string;
  checkinTime?: string;
  
  // Contact
  name: string;
  email: string;
  phone: string;
  
  // Add-ons
  addOns: {
    deepCleaning: boolean;
    laundry: boolean;
    laundryLoads: number;
    laundryLocation: 'onsite' | 'offsite' | '';
    insideFridge: boolean;
    insideWindows: boolean;
    hotTubBasic: boolean;
    hotTubFullClean: boolean;
    hotTubFullCleanFrequency: 'monthly' | 'bi-monthly' | 'tri-monthly' | 'quarterly' | 'every-5-months' | 'every-6-months';
    hotTubFirstClean: boolean;
  };
  
  // Frequency
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'tri-weekly' | 'monthly';
  
  // Additional Info
  parking: string;
  parkingOther: string;
  flexibility: string;
  access: string;
  smartLockCode: string;
  accessCode: string;
  additionalNotes: string;
  checklistFile?: File;
  checklistOption: string;
  
  // Pricing
  priceResult?: any;
}

const BookingFlow = () => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('property');
  const [bookingData, setBookingData] = useState<BookingData>({
    address1: '',
    address2: '',
    city: '',
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
      laundryLoads: 1,
      laundryLocation: '',
      insideFridge: false,
      insideWindows: false,
      hotTubBasic: false,
      hotTubFullClean: false,
      hotTubFullCleanFrequency: 'monthly',
      hotTubFirstClean: false,
    },
    frequency: 'one-time',
    parking: '',
    parkingOther: '',
    flexibility: '',
    access: '',
    smartLockCode: '',
    accessCode: '',
    additionalNotes: '',
    checklistOption: '', // 'custom' or 'basic'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const getSteps = (): BookingStep[] => {
    const baseSteps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'addons'];
    
    // Skip frequency step for VR subscriptions since they already selected subscription length
    if (bookingData.serviceType !== 'VR') {
      baseSteps.push('frequency');
    }
    
    baseSteps.push('info', 'payment');
    return baseSteps;
  };

  const goToNextStep = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const steps = getSteps();
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
      bookingData.frequency,
      bookingData.serviceType.toLowerCase()
    );
  };

  // Calculate minimum booking date (September 23rd, 2025)
  const getMinimumBookingDate = () => {
    return EARLIEST_CLEAN_DATE;
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
      state: 'Florida',
      zipcode: bookingData.zipcode,
      beds: bookingData.beds,
      baths: bookingData.baths,
      halfBaths: bookingData.halfBaths,
      sqft: bookingData.sqft,
      serviceType: bookingData.serviceType,
      startDate: bookingData.startDate,
      startTime: bookingData.serviceType === 'VR' ? bookingData.checkoutTime : bookingData.startTime,
      months: bookingData.months,
      addOns: bookingData.addOns,
      frequency: bookingData.frequency,
      basePrice: priceResult.price,
      totalPrice: priceResult.price,
      parkingInfo: bookingData.parking === 'other' ? bookingData.parkingOther : bookingData.parking,
      scheduleFlexibility: bookingData.flexibility,
      accessMethod: bookingData.access,
      smartLockCode: bookingData.smartLockCode,
      specialInstructions: bookingData.additionalNotes,
      cleaningType: bookingData.cleaningType,
      checkoutTime: bookingData.checkoutTime,
      checkinTime: bookingData.checkinTime,
      icalUrl: bookingData.icalUrl
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
                {[1, 2, 3, 4, 5].map((num) => (
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
                {[1, 2, 3, 4, 5].map((num) => (
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
            value={bookingData.sqft === 0 ? '' : bookingData.sqft}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            onValueChange={(value: 'Residential' | 'VR') => {
              updateBookingData({ 
                serviceType: value,
                cleaningType: value === 'VR' ? 'subscription' : '',
                frequency: value === 'VR' ? 'weekly' : 'one-time'
              });
            }}
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
                  <div className="text-sm text-muted-foreground">Automated turnover cleaning (subscription only)</div>
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
              Connect your booking calendar for automatic scheduling
            </p>
          </div>
        )}


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
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={bookingData.startDate}
              onChange={(e) => updateBookingData({ startDate: e.target.value })}
              min={getMinimumBookingDate()}
              required
            />
            <p className="text-sm text-muted-foreground">
              Earliest available date: {getMinimumBookingDate()}
            </p>
          </div>

          {bookingData.serviceType === 'VR' ? (
            <div className="space-y-2">
              <Label htmlFor="checkoutTime">Checkout Time</Label>
              <Select value={bookingData.checkoutTime || ''} onValueChange={(value) => updateBookingData({ checkoutTime: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select checkout time" />
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
                </SelectContent>
              </Select>
            </div>
          ) : (
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
          )}
        </div>

        {bookingData.serviceType === 'VR' && (
          <div className="space-y-2">
            <Label htmlFor="checkinTime">Check-in Time</Label>
            <Select value={bookingData.checkinTime || ''} onValueChange={(value) => updateBookingData({ checkinTime: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select check-in time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                <SelectItem value="8:00 PM">8:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="p-4 bg-gradient-hero rounded-lg">
          <h4 className="font-semibold text-primary mb-2">What to Expect:</h4>
          {bookingData.serviceType === 'VR' ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Complete turnover cleaning between guests</li>
              <li>• Linen changes and laundry service</li>
              <li>• Property staging and restocking</li>
              <li>• Automated scheduling based on your calendar</li>
            </ul>
          ) : (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Professional, insured cleaners</li>
              <li>• Customizable cleaning checklist</li>
              <li>• Eco-friendly products available</li>
              <li>• Flexible scheduling based on your preferences</li>
            </ul>
          )}
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
          {bookingData.serviceType !== 'VR' && (
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
          )}

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
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
                  <Label htmlFor="laundry" className="font-medium cursor-pointer">Laundry Service</Label>
                  <p className="text-sm text-muted-foreground">Wash, dry, and fold your laundry</p>
                </div>
              </div>
              <span className="font-semibold text-primary">$9/load</span>
            </div>
            
            {bookingData.addOns.laundry && (
              <div className="space-y-4 ml-8">
                <div className="space-y-2">
                  <Label htmlFor="laundryLoads">Number of Loads</Label>
                  <Select 
                    value={bookingData.addOns.laundryLoads.toString()} 
                    onValueChange={(value) => 
                      updateBookingData({ 
                        addOns: { ...bookingData.addOns, laundryLoads: parseInt(value) }
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
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
                  <Label>Laundry Location</Label>
                  <RadioGroup 
                    value={bookingData.addOns.laundryLocation} 
                    onValueChange={(value: 'onsite' | 'offsite') => 
                      updateBookingData({ 
                        addOns: { ...bookingData.addOns, laundryLocation: value }
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="onsite" id="onsite" />
                      <Label htmlFor="onsite" className="cursor-pointer">On-site laundry</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="offsite" id="offsite" />
                      <Label htmlFor="offsite" className="cursor-pointer">Off-site laundry (+$20 base)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          {bookingData.serviceType !== 'VR' && (
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
          )}

          {bookingData.serviceType !== 'VR' && (
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
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="hotTubBasic"
                checked={bookingData.addOns.hotTubBasic}
                onCheckedChange={(checked) => 
                  updateBookingData({ 
                    addOns: { ...bookingData.addOns, hotTubBasic: checked as boolean }
                  })
                }
              />
              <div>
                <Label htmlFor="hotTubBasic" className="font-medium cursor-pointer">Hot Tub Basic Clean</Label>
                <p className="text-sm text-muted-foreground">Basic hot tub cleaning and maintenance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wiping and skimming, chemical testing, and adding chemicals. Please have the chemicals, tools and test strips you would like us to use on site.
                </p>
              </div>
            </div>
            <span className="font-semibold text-primary">+$20</span>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="hotTubFullClean"
                  checked={bookingData.addOns.hotTubFullClean}
                  onCheckedChange={(checked) => 
                    updateBookingData({ 
                      addOns: { 
                        ...bookingData.addOns, 
                        hotTubFullClean: checked as boolean,
                        // For residential one-time, automatically set hotTubFirstClean to true when hotTubFullClean is selected
                        hotTubFirstClean: (bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time') 
                          ? checked as boolean 
                          : bookingData.addOns.hotTubFirstClean
                      }
                    })
                  }
                />
                <div>
                  <Label htmlFor="hotTubFullClean" className="font-medium cursor-pointer">Hot Tub Full Drain & Clean</Label>
                  <p className="text-sm text-muted-foreground">Complete drain, deep clean, and refill</p>
                </div>
              </div>
              {/* Show +$50 immediately for residential one-time */}
              {bookingData.addOns.hotTubFullClean && bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time' && (
                <span className="font-semibold text-primary">+$50</span>
              )}
            </div>
            
            {bookingData.addOns.hotTubFullClean && (
              <div className="space-y-4 ml-8">
                {/* Only show frequency options for non-residential-one-time services */}
                {!(bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time') && (
                  <div className="space-y-2">
                    <Label htmlFor="hotTubFrequency">How often for full drain & clean?</Label>
                    <Select 
                      value={bookingData.addOns.hotTubFullCleanFrequency} 
                      onValueChange={(value: 'monthly' | 'bi-monthly' | 'tri-monthly' | 'quarterly' | 'every-5-months' | 'every-6-months') => 
                        updateBookingData({ 
                          addOns: { ...bookingData.addOns, hotTubFullCleanFrequency: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="bi-monthly">Every 2 Months</SelectItem>
                        <SelectItem value="tri-monthly">Every 3 Months</SelectItem>
                        <SelectItem value="quarterly">Every 4 Months</SelectItem>
                        <SelectItem value="every-5-months">Every 5 Months</SelectItem>
                        <SelectItem value="every-6-months">Every 6 Months</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Full Drain and Clean will be assigned, charged and performed at this interval. If you need basic cleans every turnover please also add the basic clean option.
                    </p>
                  </div>
                )}

                {/* Show first clean option only for non-residential-one-time services */}
                {!(bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time') && (
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="hotTubFirstClean"
                      checked={bookingData.addOns.hotTubFirstClean}
                      onCheckedChange={(checked) => 
                        updateBookingData({ 
                          addOns: { ...bookingData.addOns, hotTubFirstClean: checked as boolean }
                        })
                      }
                    />
                    <Label htmlFor="hotTubFirstClean" className="cursor-pointer">
                      Would you like this done on the first clean?
                    </Label>
                    {bookingData.addOns.hotTubFirstClean && (
                      <span className="font-semibold text-primary">+$50</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price Preview */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          {(() => {
            const result = calculateCurrentPrice();
            if (result.isCustomQuote) {
              return (
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                  <p className="text-sm text-muted-foreground">Properties over 3,000 sq ft require a custom quote</p>
                </div>
              );
            }
            
            const hasHotTubFirstClean = bookingData.addOns.hotTubFirstClean;
            const hotTubPrice = hasHotTubFirstClean ? 50 : 0;
            const perCleaningPrice = result.price - hotTubPrice;
            
            return (
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(perCleaningPrice * 100)}</p>
                  <p className="text-sm text-muted-foreground">per cleaning</p>
                </div>
                {hasHotTubFirstClean && (
                  <div className="text-center pt-2 border-t">
                    <p className="text-lg font-semibold text-primary">{formatCurrency(hotTubPrice * 100)}</p>
                    <p className="text-sm text-muted-foreground">
                      {bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time' 
                        ? 'Hot Tub Full Drain & Clean' 
                        : 'First Hot Tub Full Drain & Clean (one-time)'}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );

  const renderFrequencyStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <Clock className="h-5 w-5 mr-2" />
          {bookingData.serviceType === 'VR' ? 'Subscription Details' : 'How Often?'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookingData.serviceType === 'VR' ? (
          <div className="p-4 bg-gradient-hero rounded-lg">
            <h4 className="font-semibold text-primary mb-2">Vacation Rental Subscription</h4>
            <p className="text-sm text-muted-foreground">
              Your vacation rental will be cleaned automatically based on your booking calendar. 
              We'll clean between every guest checkout and check-in according to your iCal feed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cleaning Option Section moved from service step */}
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
                      <div className="text-sm text-muted-foreground">Recurring service with discounts - get up to 15% off!</div>
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

            {/* Frequency Selection */}
            {bookingData.cleaningType && (
              <div className="space-y-4">
                <Label>How Often?</Label>
                <RadioGroup 
                  value={bookingData.frequency} 
                  onValueChange={(value: BookingData['frequency']) => updateBookingData({ frequency: value })}
                >
                  {bookingData.cleaningType === 'one-time' ? (
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
                  ) : (
                    <>
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
                    </>
                  )}
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        {/* Price Preview */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          {(() => {
            const result = calculateCurrentPrice();
            return result.isCustomQuote ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                <p className="text-sm text-muted-foreground">Properties over 3,000 sq ft require a custom quote</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-primary text-center mb-3">Price Breakdown</h4>
                <div className="space-y-1 text-sm">
                  {/* Calculate price without hot tub first clean */}
                  {(() => {
                    const priceWithoutHotTubFirstClean = calculatePrice(
                      bookingData.beds,
                      bookingData.baths,
                      bookingData.halfBaths,
                      bookingData.sqft,
                      {
                        ...bookingData.addOns,
                        hotTubFirstClean: false // Exclude first clean to show separate pricing
                      },
                      bookingData.frequency,
                      bookingData.serviceType === 'VR' ? 'vacation_rental' : 'residential'
                    );
                    
                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Per cleaning:</span>
                          <span className="font-semibold">{formatCurrency(priceWithoutHotTubFirstClean.price * 100)}</span>
                        </div>
                        {bookingData.addOns.hotTubFirstClean && (
                          <div className="flex justify-between">
                            <span>
                              {bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time' 
                                ? 'Hot Tub Full Drain & Clean:' 
                                : 'First Hot Tub Full Drain & Clean:'}
                            </span>
                            <span className="font-semibold">+{formatCurrency(50 * 100)}</span>
                          </div>
                        )}
                        <hr className="my-2" />
                        <div className="flex justify-between text-lg font-bold text-primary">
                          <span>Total per cleaning:</span>
                          <span>{formatCurrency(result.price * 100)}</span>
                        </div>
                        {result.breakdown.discount > 0 && (
                          <p className="text-sm text-green-600 mt-1 text-center">
                            You save {formatCurrency(result.breakdown.discount * 100)} per cleaning!
                          </p>
                        )}
                        {bookingData.addOns.hotTubFirstClean && (
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            Hot Tub First Clean is a one-time charge added to your first cleaning
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );

  const renderInfoStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          <MapPin className="h-5 w-5 mr-2" />
          Additional Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Parking Information</Label>
            <RadioGroup 
              value={bookingData.parking} 
              onValueChange={(value) => updateBookingData({ parking: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="driveway" id="driveway" />
                <Label htmlFor="driveway" className="cursor-pointer">Driveway available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="street" id="street" />
                <Label htmlFor="street" className="cursor-pointer">Street parking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="garage" id="garage" />
                <Label htmlFor="garage" className="cursor-pointer">Garage available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="cursor-pointer">Other</Label>
              </div>
            </RadioGroup>
            
            {bookingData.parking === 'other' && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="parkingOther">Please specify parking details</Label>
                <Input
                  id="parkingOther"
                  value={bookingData.parkingOther}
                  onChange={(e) => updateBookingData({ parkingOther: e.target.value })}
                  placeholder="Describe parking situation"
                />
              </div>
            )}
          </div>

          {bookingData.serviceType !== 'VR' && (
            <div className="space-y-2">
              <Label>Schedule Flexibility</Label>
              <RadioGroup 
                value={bookingData.flexibility} 
                onValueChange={(value) => updateBookingData({ flexibility: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exact" id="exact" />
                  <Label htmlFor="exact" className="cursor-pointer">Must be exact time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flexible" id="flexible" />
                  <Label htmlFor="flexible" className="cursor-pointer">Flexible within 2 hours</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anytime" id="anytime" />
                  <Label htmlFor="anytime" className="cursor-pointer">Anytime during business hours</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>Property Access</Label>
            <RadioGroup 
              value={bookingData.access} 
              onValueChange={(value) => updateBookingData({ access: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="key" id="key" />
                <Label htmlFor="key" className="cursor-pointer">Hidden key</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lockbox" id="lockbox" />
                <Label htmlFor="lockbox" className="cursor-pointer">Lock box</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="smart_lock" id="smart_lock" />
                <Label htmlFor="smart_lock" className="cursor-pointer">Smart lock code</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="person" id="person" />
                <Label htmlFor="person" className="cursor-pointer">Someone will be present</Label>
              </div>
            </RadioGroup>
            
            {(bookingData.access === 'key' || bookingData.access === 'lockbox') && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="accessCode">
                  {bookingData.access === 'lockbox' ? 'Lock Box Code' : 'Hidden Key Location'}
                </Label>
                <Input
                  id="accessCode"
                  value={bookingData.accessCode}
                  onChange={(e) => updateBookingData({ accessCode: e.target.value })}
                  placeholder={bookingData.access === 'lockbox' ? 'Enter lock box code' : 'Describe where the key is hidden'}
                  type={bookingData.access === 'lockbox' ? 'password' : 'text'}
                />
              </div>
            )}
            
            {bookingData.access === 'smart_lock' && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="smartLockCode">Smart Lock Code</Label>
                <Input
                  id="smartLockCode"
                  value={bookingData.smartLockCode}
                  onChange={(e) => updateBookingData({ smartLockCode: e.target.value })}
                  placeholder="Enter door code"
                  type="password"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cleaning Checklist <span className="text-red-500">*</span></Label>
              <RadioGroup 
                value={bookingData.checklistOption} 
                onValueChange={(value) => updateBookingData({ checklistOption: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="basic" />
                  <Label htmlFor="basic" className="cursor-pointer">Use CleanNami Basic Checklist</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">Upload My Custom Checklist</Label>
                </div>
              </RadioGroup>
            </div>

            {bookingData.checklistOption === 'custom' && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="checklistFile">Upload Custom Cleaning Checklist</Label>
                <Input
                  id="checklistFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateBookingData({ checklistFile: file });
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a PDF or image of your custom cleaning checklist
                </p>
              </div>
            )}

            {bookingData.checklistOption === 'basic' && (
              <div className="ml-6 p-3 bg-gradient-hero rounded-lg">
                <p className="text-sm text-muted-foreground">
                  We'll use our comprehensive CleanNami checklist that covers all standard cleaning tasks including bathrooms, kitchen, bedrooms, and common areas.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes or Special Instructions</Label>
            <Textarea
              id="additionalNotes"
              value={bookingData.additionalNotes}
              onChange={(e) => updateBookingData({ additionalNotes: e.target.value })}
              placeholder="Any special instructions for our cleaning team..."
              rows={4}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="text-primary">Review & Pay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">Booking Summary</h3>
          
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Type:</span>
              <span>{bookingData.serviceType === 'VR' ? 'Vacation Rental' : 'Residential'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property:</span>
              <span>{bookingData.beds} bed, {bookingData.baths} bath, {bookingData.sqft} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span>{bookingData.address1}, {bookingData.city}</span>
            </div>
            {bookingData.cleaningType === 'subscription' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription:</span>
                <span>{bookingData.months} months</span>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="p-4 bg-gradient-hero rounded-lg">
            <h4 className="font-semibold text-primary mb-3">Price Breakdown</h4>
            {(() => {
              const result = calculateCurrentPrice();
              if (result.isCustomQuote) {
                return (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                    <p className="text-sm text-muted-foreground">We'll contact you within 24 hours</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>{formatCurrency(result.breakdown.basePrice * 100)}</span>
                  </div>
                  {result.breakdown.sqftSurcharge > 0 && (
                    <div className="flex justify-between">
                      <span>Size Surcharge:</span>
                      <span>{formatCurrency(result.breakdown.sqftSurcharge * 100)}</span>
                    </div>
                  )}
                  {result.breakdown.addOnsPrice > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons:</span>
                      <span>{formatCurrency(result.breakdown.addOnsPrice * 100)}</span>
                    </div>
                  )}
                  {result.breakdown.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(result.breakdown.discount * 100)}</span>
                    </div>
                  )}
                  {bookingData.addOns.hotTubFirstClean && (
                    <div className="flex justify-between">
                      <span>
                        {bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time' 
                          ? 'Hot Tub Full Drain & Clean:' 
                          : 'First Hot Tub Full Drain & Clean:'}
                      </span>
                      <span>{formatCurrency(50 * 100)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Total per cleaning:</span>
                    <span>{formatCurrency(result.price * 100)}</span>
                  </div>
                  {bookingData.addOns.hotTubFirstClean && (
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>
                        {bookingData.serviceType === 'Residential' && bookingData.frequency === 'one-time' 
                          ? 'Hot Tub Full Drain & Clean (one-time):' 
                          : 'First Hot Tub Clean (one-time):'}
                      </span>
                      <span>+{formatCurrency(50 * 100)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <CleanNamiButton 
          variant="hero" 
          size="xl" 
          className="w-full" 
          onClick={handleBookingSubmit}
          disabled={isLoading}
        >
          {(() => {
            if (isLoading) return 'Processing...';
            const result = calculateCurrentPrice();
            if (result.isCustomQuote) return 'Request Quote';
            
            // Calculate total including hot tub first clean charge
            let totalPrice = result.price * 100;
            if (bookingData.addOns.hotTubFirstClean) {
              totalPrice += 50 * 100; // Add $50 for hot tub first clean
            }
            
            return `Pay ${formatCurrency(totalPrice)} & Book`;
          })()}
        </CleanNamiButton>
      </CardContent>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'property': return renderPropertyStep();
      case 'service': return renderServiceStep();
      case 'schedule': return renderScheduleStep();
      case 'contact': return renderContactStep();
      case 'addons': return renderAddOnsStep();
      case 'frequency': return renderFrequencyStep();
      case 'info': return renderInfoStep();
      case 'payment': return renderPaymentStep();
      default: return renderPropertyStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'property': 
        return bookingData.address1 && bookingData.city && bookingData.zipcode && 
               bookingData.beds && bookingData.baths && bookingData.sqft;
      case 'service': 
        return bookingData.serviceType && 
               (bookingData.serviceType === 'VR' ? bookingData.icalUrl : true);
      case 'schedule': 
        return bookingData.startDate && 
               (bookingData.serviceType === 'VR' ? 
                 (bookingData.checkoutTime && bookingData.checkinTime) : 
                 bookingData.startTime);
      case 'contact': 
        return bookingData.name && bookingData.email && bookingData.phone;
      case 'addons': 
        return true; // Optional step
      case 'frequency': 
        return bookingData.serviceType === 'VR' || bookingData.cleaningType;
      case 'info': 
        const hasRequiredFields = bookingData.parking && bookingData.access && bookingData.checklistOption;
        const hasAccessCode = (bookingData.access === 'key' || bookingData.access === 'lockbox') ? 
          bookingData.accessCode : true;
        const hasSmartLockCode = bookingData.access === 'smart_lock' ? 
          bookingData.smartLockCode : true;
        return hasRequiredFields && hasAccessCode && hasSmartLockCode;
      default: 
        return true;
    }
  };

  const stepTitles = {
    property: 'Property Details',
    service: 'Service Type',
    schedule: 'Scheduling',
    contact: 'Contact Info',
    addons: 'Add-ons',
    frequency: bookingData.serviceType === 'VR' ? 'Subscription' : 'Frequency',
    info: 'Additional Info',
    payment: 'Payment'
  };

  const steps = getSteps();
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center space-x-2 text-primary hover:text-primary/80">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Book Your Cleaning</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
            <span className="text-sm font-medium text-primary">{stepTitles[currentStep]}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step */}
        {renderCurrentStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <CleanNamiButton
            variant="secondary"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </CleanNamiButton>

          {currentStep !== 'payment' && (
            <CleanNamiButton
              variant="ocean"
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </CleanNamiButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;