import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminAuth = () => {
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
      // Check for default admin credentials
      if (formData.email === "admin@cleannami.com" && formData.password === "admin123") {
        toast({
          title: "Admin Login Successful",
          description: "Welcome to the CleanNami admin panel!",
        });
        // TODO: Set proper authentication state
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 1500);
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
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
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-primary">
              Admin Portal
            </CardTitle>
            <p className="text-muted-foreground">
              Secure access to CleanNami administration
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="admin@cleannami.com"
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
                  placeholder="Enter admin password"
                  required
                />
              </div>

              <CleanNamiButton 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Admin Panel"}
              </CleanNamiButton>
            </form>

            {/* Default Credentials Info */}
            <div className="mt-6 p-4 bg-secondary/20 rounded-lg border-l-4 border-primary">
              <h4 className="font-semibold text-primary mb-2">Default Credentials:</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> admin@cleannami.com<br />
                <strong>Password:</strong> admin123
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please change these credentials after first login.
              </p>
            </div>

            <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Admin Capabilities:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create and manage contractor accounts</li>
                <li>• Approve and mark jobs as paid</li>
                <li>• View all payment events and transfers</li>
                <li>• Monitor system health and metrics</li>
                <li>• Handle customer service issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuth;