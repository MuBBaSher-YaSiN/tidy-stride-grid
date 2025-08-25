import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Calendar, Home, User, Mail, Phone, MapPin } from "lucide-react";
import { calculatePrice, formatCurrency, FLORIDA_CITIES, EARLIEST_CLEAN_DATE, type FloridaCity } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

type BookingStep = 'property' | 'service' | 'schedule' | 'contact' | 'payment';

interface BookingData {
  // Property details
  address1: string;
  address2: string;
  city: FloridaCity | '';
  zipcode: string;
  beds: number;
  baths: number;
  sqft: number;
  
  // Service details  
  serviceType: 'Residential' | 'VR' | '';
  months: number;
  icalUrl?: string;
  
  // Schedule
  startDate: string;
  
  // Contact
  name: string;
  email: string;
  phone: string;
  
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
    beds: 2,
    baths: 2,
    sqft: 1200,
    serviceType: '',
    months: 3,
    startDate: '',
    name: '',
    email: '',
    phone: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const goToNextStep = () => {
    const steps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'payment'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const steps: BookingStep[] = ['property', 'service', 'schedule', 'contact', 'payment'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const calculateCurrentPrice = () => {
    const result = calculatePrice(bookingData.beds, bookingData.baths, bookingData.sqft);
    updateBookingData({ priceResult: result });
    return result;
  };

  const handleBookingSubmit = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual booking submission to Supabase
      toast({
        title: "Booking Submitted!",
        description: "Your cleaning subscription has been created. You'll receive a confirmation email shortly.",
      });
      
      setTimeout(() => {
        navigate("/booking-success");
      }, 2000);
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                const result = calculatePrice(bookingData.beds, bookingData.baths, bookingData.sqft);
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
            <Label htmlFor="icalUrl">iCal URL (Optional)</Label>
            <Input
              id="icalUrl"
              value={bookingData.icalUrl || ''}
              onChange={(e) => updateBookingData({ icalUrl: e.target.value })}
              placeholder="https://www.airbnb.com/calendar/ical/..."
            />
            <p className="text-sm text-muted-foreground">
              Connect your Airbnb/VRBO calendar for automatic scheduling
            </p>
          </div>
        )}

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
                <span>{bookingData.address1}, {bookingData.city}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{bookingData.beds} bed, {bookingData.baths} bath, {bookingData.sqft} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span>Service:</span>
                <span>{bookingData.serviceType} ({bookingData.months} months)</span>
              </div>
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span>{bookingData.startDate}</span>
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
            disabled={isLoading || priceResult.isCustomQuote}
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
      case 'payment': return renderPaymentStep();
      default: return renderPropertyStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'property':
        return bookingData.address1 && bookingData.city && bookingData.zipcode && bookingData.beds && bookingData.baths && bookingData.sqft;
      case 'service':
        return bookingData.serviceType && bookingData.months;
      case 'schedule':
        return bookingData.startDate;
      case 'contact':
        return bookingData.name && bookingData.email && bookingData.phone;
      case 'payment':
        return true;
      default:
        return false;
    }
  };

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
              <p className="text-sm text-muted-foreground">Step {['property', 'service', 'schedule', 'contact', 'payment'].indexOf(currentStep) + 1} of 5</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex justify-between mb-2">
          {(['property', 'service', 'schedule', 'contact', 'payment'] as BookingStep[]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['property', 'service', 'schedule', 'contact', 'payment'].indexOf(currentStep) >= index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < 4 && (
                <div className={`w-12 h-1 mx-2 rounded ${
                  ['property', 'service', 'schedule', 'contact', 'payment'].indexOf(currentStep) > index
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