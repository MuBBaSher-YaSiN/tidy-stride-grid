import React from "react";
import { Link } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Mail, Phone, Home } from "lucide-react";

const BookingSuccess = () => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-gradient-card shadow-hero">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
          <CardTitle className="text-3xl text-primary mb-2">
            Booking Confirmed!
          </CardTitle>
          <p className="text-muted-foreground">
            Your CleanNami cleaning subscription has been successfully created.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Confirmation Details */}
          <div className="p-6 bg-gradient-hero rounded-lg">
            <h3 className="font-semibold text-primary mb-4">What Happens Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a detailed confirmation email within the next few minutes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium">Contractor Assignment</p>
                  <p className="text-sm text-muted-foreground">
                    We'll assign a qualified contractor in your area within 24 hours.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium">Pre-Service Contact</p>
                  <p className="text-sm text-muted-foreground">
                    Your contractor will contact you 24 hours before your first cleaning.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Home className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium">First Cleaning</p>
                  <p className="text-sm text-muted-foreground">
                    Your first deep cleaning will be completed on your scheduled date.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="p-6 bg-secondary/20 rounded-lg border-l-4 border-primary">
            <h3 className="font-semibold text-primary mb-4">Important Information</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Your first cleaning has been charged and will be held until service completion</li>
              <li>• Future cleanings will be charged only after completion</li>
              <li>• You can modify or pause your subscription at any time</li>
              <li>• All cleaners are insured and background-checked</li>
              <li>• 100% satisfaction guarantee on all services</li>
            </ul>
          </div>

          {/* Support Information */}
          <div className="p-6 bg-gradient-hero rounded-lg">
            <h3 className="font-semibold text-primary mb-4">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our customer support team is here to help with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <CleanNamiButton variant="ocean" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </CleanNamiButton>
              <CleanNamiButton variant="ghost" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Call Support
              </CleanNamiButton>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/" className="flex-1">
              <CleanNamiButton variant="hero" className="w-full">
                Return to Home
              </CleanNamiButton>
            </Link>
            <CleanNamiButton variant="outline" className="flex-1">
              View Booking Details
            </CleanNamiButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSuccess;