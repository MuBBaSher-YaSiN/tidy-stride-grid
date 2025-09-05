import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const ContractorAuth = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast({
        title: "Signed in successfully",
        description: "Welcome back to CleanNami!",
      });

      // Navigate to contractor dashboard
      navigate("/contractor/dashboard");
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid email or password. Please contact admin if you need help.",
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
              Contractor Login
            </CardTitle>
            <p className="text-muted-foreground">
              Sign in to manage your cleaning jobs
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <CleanNamiButton 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </CleanNamiButton>
            </form>

            {/* Account Setup Info */}
            <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Need Account Access?</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Contractor accounts are created by CleanNami administrators.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact admin for account setup and credentials.
              </p>
            </div>

            <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Contractor Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 70% payout rate (minimum $60 per job)</li>
                <li>• Flexible scheduling - claim jobs when available</li>
                <li>• Direct Stripe payouts</li>
                <li>• Support multiple service areas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorAuth;