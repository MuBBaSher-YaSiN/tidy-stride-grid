import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Mail, Lock, MapPin } from "lucide-react";
import { FLORIDA_CITIES } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

const ContractorAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    city: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement actual authentication logic
      toast({
        title: isLogin ? "Login Successful" : "Registration Successful",
        description: isLogin 
          ? "Welcome back! Redirecting to your dashboard..." 
          : "Account created successfully. Please check your email for verification.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link to="/" className="flex items-center text-primary hover:text-primary/80 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="shadow-hero bg-gradient-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">
              {isLogin ? "Contractor Login" : "Join Our Team"}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Sign in to manage your cleaning jobs" 
                : "Become a CleanNami contractor"}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Service Area
                  </Label>
                  <Select value={formData.city} onValueChange={(value) => handleInputChange("city", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your service area" />
                    </SelectTrigger>
                    <SelectContent>
                      {FLORIDA_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <CleanNamiButton 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading 
                  ? "Please wait..." 
                  : isLogin 
                    ? "Sign In" 
                    : "Create Account"
                }
              </CleanNamiButton>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
              >
                {isLogin 
                  ? "Need an account? Sign up here" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>

            {!isLogin && (
              <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
                <h4 className="font-semibold text-primary mb-2">Contractor Benefits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 70% payout rate (minimum $60 per job)</li>
                  <li>• Flexible scheduling - claim jobs when available</li>
                  <li>• Direct Stripe payouts</li>
                  <li>• Support multiple service areas</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorAuth;