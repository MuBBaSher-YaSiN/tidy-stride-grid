import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  Plus,
  ArrowLeft,
  Mail,
  MapPin,
  Calendar
} from "lucide-react";

interface Contractor {
  id: string;
  name: string;
  email: string;
  city: string;
  created_at: string;
}

const ContractorManagement = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContractors(data || []);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contractors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('contractors')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contractor created successfully"
      });

      setFormData({ name: "", email: "", city: "" });
      setShowCreateDialog(false);
      fetchContractors();
    } catch (error) {
      console.error('Error creating contractor:', error);
      toast({
        title: "Error",
        description: "Failed to create contractor",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="bg-card shadow-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/admin/dashboard">
                <CleanNamiButton variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </CleanNamiButton>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-primary">Contractor Management</h1>
                <p className="text-sm text-muted-foreground">Manage cleaning contractors</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <CleanNamiButton variant="hero">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contractor
                </CleanNamiButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Contractor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateContractor} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <CleanNamiButton type="submit" variant="hero" className="w-full">
                    Create Contractor
                  </CleanNamiButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Users className="h-5 w-5 mr-2" />
              All Contractors ({contractors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading contractors...</div>
            ) : contractors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No contractors found. Create the first one!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell className="font-medium">{contractor.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {contractor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          {contractor.city}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(contractor.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorManagement;