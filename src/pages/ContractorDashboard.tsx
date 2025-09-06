import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Calendar, 
  DollarSign, 
  MapPin,
  LogOut,
  CheckCircle,
  Clock,
  TrendingUp,
  HandIcon,
  Send
} from "lucide-react";

interface Job {
  id: string;
  date: string;
  status: string;
  price_cents: number;
  payout_cents: number;
  city: string;
  notes?: string;
  claimed_by?: string;
  contractor_id?: string;
  claimed_at?: string;
  completed_at?: string;
  submitted_at?: string;
  bookings?: {
    customer_name: string;
    property_address: string;
    property_beds: number;
    property_baths: number;
    service_type: string;
  } | null;
}

interface Stats {
  availableJobs: number;
  myJobs: number;
  completedJobs: number;
  totalEarnings: number;
}

const ContractorDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({
    availableJobs: 0,
    myJobs: 0,
    completedJobs: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!cancelled) {
          if (!user) {
            navigate('/contractor');
            return;
          }
          
          setUser(user);
          setIsAuthChecked(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error getting user:', error);
          navigate('/contractor');
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled) {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/contractor');
        } else if (session?.user) {
          setUser(session.user);
          setIsAuthChecked(true);
        }
      }
    });

    initializeAuth();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (user && isAuthChecked) {
      fetchJobs();
      fetchMyJobs();
    }
  }, [user, isAuthChecked]);

  const fetchJobs = async () => {
    try {
      if (!user?.id) return;

      // Wait for user session to be ready, then fetch available jobs
      // RLS will auto-filter by contractor's city_norm and status='New'
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          bookings:booking_id (
            customer_name, 
            property_address, 
            property_beds, 
            property_baths, 
            service_type
          )
        `)
        .eq('status', 'New')
        .order('date', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchMyJobs = async () => {
    try {
      if (!user?.id) return;

      // Get contractor ID first
      const { data: contractor } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!contractor) {
        console.log('No contractor found for user');
        setLoading(false);
        return;
      }

      // Fetch my jobs (claimed or assigned to this contractor, RLS will auto-filter)
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          bookings:booking_id (
            customer_name, 
            property_address, 
            property_beds, 
            property_baths, 
            service_type
          )
        `)
        .or(`claimed_by.eq.${contractor.id},contractor_id.eq.${contractor.id}`)
        .order('date', { ascending: true });

      if (error) throw error;
      
      const myJobsData = data || [];
      setMyJobs(myJobsData);

      // Calculate stats
      const completedJobs = myJobsData.filter(job => job.status === 'Completed').length;
      const totalEarnings = myJobsData
        .filter(job => job.status === 'Completed')
        .reduce((sum, job) => sum + (job.payout_cents / 100), 0);

      setStats({
        availableJobs: jobs.length,
        myJobs: myJobsData.length,
        completedJobs,
        totalEarnings
      });
    } catch (error) {
      console.error('Error fetching my jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimJob = async (jobId: string) => {
    try {
      // Get contractor ID first
      const { data: contractor } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!contractor) {
        toast({
          title: "Error",
          description: "Contractor profile not found",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('jobs')
        .update({ 
          claimed_by: contractor.id, 
          claimed_at: new Date().toISOString(),
          status: 'Claimed'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job claimed successfully! Wait for admin assignment."
      });

      fetchJobs();
      fetchMyJobs();
    } catch (error) {
      console.error('Error claiming job:', error);
      toast({
        title: "Error",
        description: "Failed to claim job",
        variant: "destructive"
      });
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'InProgress') {
        // Job started
      } else if (newStatus === 'Submitted') {
        updateData.submitted_at = new Date().toISOString();
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      // If job is submitted, create payment request
      if (newStatus === 'Submitted') {
        const job = myJobs.find(j => j.id === jobId);
        const { data: contractor } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (job && contractor) {
          const { error: paymentError } = await supabase
            .from('payment_requests')
            .insert({
              job_id: jobId,
              contractor_id: contractor.id,
              amount_cents: job.payout_cents,
              status: 'pending'
            });

          if (paymentError) {
            console.error('Error creating payment request:', paymentError);
          }
        }
      }

      toast({
        title: "Success",
        description: `Job status updated to ${newStatus}`
      });

      fetchMyJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'claimed':
        return <Badge variant="outline">Claimed</Badge>;
      case 'assigned':
        return <Badge variant="default">Assigned</Badge>;
      case 'inprogress':
        return <Badge variant="outline">In Progress</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getJobActions = (job: Job) => {
    switch (job.status) {
      case 'Assigned':
        return (
          <CleanNamiButton 
            variant="success" 
            size="sm"
            onClick={() => updateJobStatus(job.id, 'InProgress')}
          >
            Start Job
          </CleanNamiButton>
        );
      case 'InProgress':
        return (
          <CleanNamiButton 
            variant="hero" 
            size="sm"
            onClick={() => updateJobStatus(job.id, 'Submitted')}
          >
            <Send className="h-4 w-4 mr-1" />
            Submit Completed
          </CleanNamiButton>
        );
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/contractor');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  // Show loading while checking authentication
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-primary">Loading...</div>
          <div className="text-sm text-muted-foreground">Checking authentication</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="bg-card shadow-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Contractor Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your cleaning jobs</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
                Contractor
              </Badge>
              <CleanNamiButton 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </CleanNamiButton>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
              <HandIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.availableJobs}</div>
              <p className="text-xs text-muted-foreground">
                Ready to claim
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Jobs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.myJobs}</div>
              <p className="text-xs text-muted-foreground">
                Active & completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.completedJobs}</div>
              <p className="text-xs text-muted-foreground">
                Successfully finished
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${stats.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From completed jobs
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Jobs */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-primary flex items-center">
                <HandIcon className="h-5 w-5 mr-2" />
                Available Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No available jobs in your area.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                     <TableRow>
                       <TableHead>Date</TableHead>
                       <TableHead>Property</TableHead>
                       <TableHead>City</TableHead>
                       <TableHead>Payout</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {jobs.map((job) => (
                       <TableRow key={job.id}>
                         <TableCell>
                           <div className="flex items-center">
                             <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                             {new Date(job.date).toLocaleDateString()}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div>
                             <div className="font-medium">
                               {job.bookings?.property_address || job.notes}
                             </div>
                             <div className="text-sm text-muted-foreground">
                               {job.bookings?.property_beds}BR / {job.bookings?.property_baths}BA
                             </div>
                             {job.bookings?.customer_name && (
                               <div className="text-sm text-muted-foreground">
                                 Customer: {job.bookings.customer_name}
                               </div>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center">
                             <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                             {job.city}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center">
                             <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                             ${(job.payout_cents / 100).toFixed(2)}
                           </div>
                         </TableCell>
                         <TableCell>
                           <CleanNamiButton 
                             variant="hero" 
                             size="sm"
                             onClick={() => claimJob(job.id)}
                           >
                             <HandIcon className="h-4 w-4 mr-1" />
                             Claim
                           </CleanNamiButton>
                         </TableCell>
                       </TableRow>
                     ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* My Jobs */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-primary flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                My Jobs ({myJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs claimed yet.
                </div>
              ) : (
                <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Date</TableHead>
                       <TableHead>Property</TableHead>
                       <TableHead>City</TableHead>
                       <TableHead>Payout</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {myJobs.map((job) => (
                       <TableRow key={job.id}>
                         <TableCell>
                           <div className="flex items-center">
                             <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                             {new Date(job.date).toLocaleDateString()}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div>
                             <div className="font-medium">
                               {job.bookings?.property_address || job.notes}
                             </div>
                             <div className="text-sm text-muted-foreground">
                               {job.bookings?.property_beds}BR / {job.bookings?.property_baths}BA
                             </div>
                             {job.bookings?.customer_name && (
                               <div className="text-sm text-muted-foreground">
                                 Customer: {job.bookings.customer_name}
                               </div>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center">
                             <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                             {job.city}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center">
                             <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                             ${(job.payout_cents / 100).toFixed(2)}
                           </div>
                         </TableCell>
                         <TableCell>
                           {getStatusBadge(job.status)}
                         </TableCell>
                         <TableCell>
                           {getJobActions(job)}
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
    </div>
  );
};

export default ContractorDashboard;