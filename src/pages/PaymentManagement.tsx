import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle,
  X,
  User,
  Clock,
  CreditCard,
  TrendingUp,
  Banknote
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

interface CustomerPayment {
  id: string;
  booking_id: string;
  job_id: string | null;
  customer_email: string;
  customer_name: string;
  amount_cents: number;
  payment_status: string;
  payment_type: string;
  payment_method: string;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  bookings: {
    id: string;
    service_type: string;
    property_city: string;
    payment_mode: string;
    cleaning_date: string;
  };
  jobs?: {
    id: string;
    date: string;
    status: string;
  };
}

const PaymentManagement = () => {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAllPaymentData();
  }, []);

  const fetchAllPaymentData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPaymentRequests(),
        fetchCustomerPayments()
      ]);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const fetchCustomerPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          bookings (
            id,
            service_type,
            property_city,
            payment_mode,
            cleaning_date
          ),
          jobs (
            id,
            date,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerPayments(data || []);

      // Calculate stats
      const totalRevenue = data?.reduce((sum, payment) => {
        return payment.payment_status === 'completed' ? sum + payment.amount_cents : sum;
      }, 0) || 0;

      const completedPayments = data?.filter(p => p.payment_status === 'completed').length || 0;
      const pendingPayments = data?.filter(p => p.payment_status === 'pending').length || 0;
      const failedPayments = data?.filter(p => p.payment_status === 'failed').length || 0;

      setStats({
        totalRevenue,
        completedPayments,
        pendingPayments,
        failedPayments
      });

    } catch (error) {
      console.error('Error fetching customer payments:', error);
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

      fetchAllPaymentData();
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
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'paid':
        return <Badge variant="outline">Paid</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const pendingPayments = paymentRequests.filter(req => req.status === 'pending');
  const approvedPayments = paymentRequests.filter(req => req.status === 'approved');
  const completedCustomerPayments = customerPayments.filter(p => p.payment_status === 'completed');
  const pendingCustomerPayments = customerPayments.filter(p => p.payment_status === 'pending');

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
                <p className="text-sm text-muted-foreground">Manage all customer and contractor payments</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Payment Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Payments</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedPayments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed Payments</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failedPayments}</p>
                </div>
                <X className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Tabs */}
        <Tabs defaultValue="customer-payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer-payments">Customer Payments</TabsTrigger>
            <TabsTrigger value="contractor-payments">Contractor Payments</TabsTrigger>
          </TabsList>
          
          {/* Customer Payments Tab */}
          <TabsContent value="customer-payments" className="space-y-6">
            {/* Recent Customer Payments */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="text-primary flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Customer Payments ({customerPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading payments...</div>
                ) : customerPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No customer payments found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{payment.customer_name}</div>
                                <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.bookings.service_type}</div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 mr-1" />
                                {payment.bookings.property_city}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {payment.bookings.payment_mode === 'one-time' ? 'One-time' : 'Subscription'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                              {formatCurrency(payment.amount_cents)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.payment_type === 'initial' ? 'default' : 'secondary'}>
                              {payment.payment_type === 'initial' ? 'Initial' : 'Recurring'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.payment_status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                              {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contractor Payments Tab */}
          <TabsContent value="contractor-payments" className="space-y-6">
            {/* Pending Payment Requests Section */}
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
                                {formatDate(request.jobs.date)}
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
                              {formatCurrency(request.amount_cents)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              {formatDate(request.requested_at)}
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
                                {formatDate(request.jobs.date)}
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
                              {formatCurrency(request.amount_cents)}
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
                  <Banknote className="h-5 w-5 mr-2" />
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
                                {formatDate(request.jobs.date)}
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
                              {formatCurrency(request.amount_cents)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                              {formatDate(request.requested_at)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentManagement;