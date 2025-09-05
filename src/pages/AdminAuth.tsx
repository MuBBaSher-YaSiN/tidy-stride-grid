import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminAuth = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1) Real Supabase sign-in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;

      // 2) Verify admin role from profiles
      const userId = data.user?.id;
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (pErr) throw pErr;
      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("You are not authorized as admin.");
      }

      toast({ title: "Admin Login Successful", description: "Welcome to CleanNami admin." });
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({
        title: "Authentication Failed",
        description: err.message || "Invalid credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center text-primary hover:text-primary/80 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="shadow-hero bg-gradient-card">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl text-primary">Admin Portal</CardTitle>
            <p className="text-muted-foreground">Secure access to CleanNami administration</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" /> Admin Email
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
                  <Lock className="h-4 w-4 mr-2" /> Password
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

              <CleanNamiButton type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? "Authenticating..." : "Access Admin Panel"}
              </CleanNamiButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuth;