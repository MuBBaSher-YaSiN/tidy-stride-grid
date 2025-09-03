import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle,
  X,
  User,
  Clock
} from "lucide-react";

interface PaymentRequest {
  id: string;
  job_id: string;
  contractor_id: string;
  amount_cents: number;
  status: string;
  requested_at: string;
  jobs: {
    date: string;
    city: string;
    notes: string;
    status: string;
  };
  contractors: {
    name: string;
    email: string;
  };
}

const PaymentManagement = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentRequests();
  }, []);

  const fetchPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          jobs (date, city, notes, status),
          contractors (name, email)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (requestId: string, newStatus: string) => {
    try {
      const updateData: any = { 
        status: newStatus 
      };
      
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payment_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment ${newStatus} successfully`
      });

      fetchPaymentRequests();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'paid':
        return <Badge variant="outline">Paid</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingPayments = paymentRequests.filter(req => req.status === 'pending');
  const approvedPayments = paymentRequests.filter(req => req.status === 'approved');

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
                <h1 className="text-2xl font-bold text-primary">Payment Management</h1>
                <p className="text-sm text-muted-foreground">Process contractor payments</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Pending Payments Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Pending Payment Requests ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading payment requests...</div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending payment requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.contractors.name}</div>
                            <div className="text-sm text-muted-foreground">{request.contractors.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {new Date(request.jobs.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {request.jobs.city}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Status: {request.jobs.status}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          ${(request.amount_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(request.requested_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <CleanNamiButton 
                            variant="success" 
                            size="sm"
                            onClick={() => updatePaymentStatus(request.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </CleanNamiButton>
                          <CleanNamiButton 
                            variant="destructive" 
                            size="sm"
                            onClick={() => updatePaymentStatus(request.id, 'rejected')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </CleanNamiButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approved Payments Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Approved Payments ({approvedPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved payments found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedPayments.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.contractors.name}</div>
                            <div className="text-sm text-muted-foreground">{request.contractors.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {new Date(request.jobs.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {request.jobs.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          ${(request.amount_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <CleanNamiButton 
                          variant="hero" 
                          size="sm"
                          onClick={() => updatePaymentStatus(request.id, 'paid')}
                        >
                          Mark as Paid
                        </CleanNamiButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* All Payment History */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              All Payment History ({paymentRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Job Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.contractors.name}</div>
                            <div className="text-sm text-muted-foreground">{request.contractors.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {new Date(request.jobs.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            {request.jobs.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          ${(request.amount_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(request.requested_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
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

export default PaymentManagement;