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
  DollarSign,
  Clock,
  CheckCircle,
  User,
  Calendar
} from "lucide-react";

interface PaymentEvent {
  id: string;
  type: string;
  status: string;
  amount_cents: number;
  created_at: string;
  error_message?: string;
  jobs?: {
    date: string;
    properties?: {
      address1: string;
    };
    contractors?: {
      name: string;
    };
  };
}

const PaymentManagement = () => {
  const [payments, setPayments] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_events')
        .select(`
          *,
          jobs (
            date,
            properties (address1),
            contractors (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payment_events')
        .update({ status: 'completed' })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment processed successfully"
      });

      fetchPayments();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
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
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'payout':
        return <Badge variant="outline">Contractor Payout</Badge>;
      case 'payment':
        return <Badge variant="secondary">Customer Payment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const pendingPayments = payments.filter(payment => payment.status.toLowerCase() === 'pending');

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
                <p className="text-sm text-muted-foreground">Process contractor payouts and customer payments</p>
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
              Pending Payments ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading payments...</div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending payments found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(payment.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          ${(payment.amount_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.jobs?.contractors ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {payment.jobs.contractors.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.jobs ? (
                          <div>
                            <div className="font-medium">{payment.jobs.properties?.address1 || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(payment.jobs.date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CleanNamiButton 
                          variant="success" 
                          size="sm"
                          onClick={() => processPayment(payment.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Process
                        </CleanNamiButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* All Payments Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Payment History ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(payment.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          ${(payment.amount_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.jobs?.contractors ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {payment.jobs.contractors.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        {payment.error_message ? (
                          <Badge variant="destructive" className="text-xs">
                            {payment.error_message.substring(0, 20)}...
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
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