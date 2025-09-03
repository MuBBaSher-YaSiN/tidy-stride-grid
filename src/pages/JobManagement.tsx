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
  Clock,
  User,
  HandIcon
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
  submitted_at?: string;
  properties?: {
    address1: string;
    beds: number;
    baths: number;
  };
  contractors?: {
    name: string;
    id: string;
  };
  claimed_contractor?: {
    name: string;
    id: string;
  };
}

interface Contractor {
  id: string;
  name: string;
  email: string;
  city: string;
}

const JobManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    fetchContractors();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          properties (address1, beds, baths),
          contractors!jobs_contractor_id_fkey (id, name),
          claimed_contractor:contractors!jobs_claimed_by_fkey (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('name');

      if (error) throw error;
      setContractors(data || []);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Job status updated to ${newStatus}`
      });

      fetchJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      });
    }
  };

  const assignJobToContractor = async (jobId: string, contractorId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          contractor_id: contractorId,
          status: 'Assigned'
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job assigned to contractor successfully"
      });

      fetchJobs();
    } catch (error) {
      console.error('Error assigning job:', error);
      toast({
        title: "Error",
        description: "Failed to assign job",
        variant: "destructive"
      });
    }
  };

  const approveCompletedJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'Completed',
          admin_approved_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job approved and marked as completed"
      });

      fetchJobs();
    } catch (error) {
      console.error('Error approving job:', error);
      toast({
        title: "Error",
        description: "Failed to approve job",
        variant: "destructive"
      });
    }
  };

  const rejectCompletedJob = async (jobId: string, reason: string = "Quality issues") => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'InProgress',
          admin_rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job rejected and sent back to contractor"
      });

      fetchJobs();
    } catch (error) {
      console.error('Error rejecting job:', error);
      toast({
        title: "Error",
        description: "Failed to reject job",
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
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getJobActions = (job: Job) => {
    switch (job.status) {
      case 'New':
        return (
          <CleanNamiButton 
            variant="success" 
            size="sm"
            onClick={() => updateJobStatus(job.id, 'Assigned')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </CleanNamiButton>
        );
      case 'Claimed':
        if (job.claimed_by) {
          return (
            <CleanNamiButton 
              variant="hero" 
              size="sm"
              onClick={() => assignJobToContractor(job.id, job.claimed_by!)}
            >
              Assign to {job.claimed_contractor?.name}
            </CleanNamiButton>
          );
        }
        return null;
      case 'Submitted':
        return (
          <div className="flex space-x-2">
            <CleanNamiButton 
              variant="success" 
              size="sm"
              onClick={() => approveCompletedJob(job.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </CleanNamiButton>
            <CleanNamiButton 
              variant="destructive" 
              size="sm"
              onClick={() => rejectCompletedJob(job.id)}
            >
              Reject
            </CleanNamiButton>
          </div>
        );
      default:
        return null;
    }
  };

  const pendingJobs = jobs.filter(job => ['New', 'Claimed', 'Submitted'].includes(job.status));
  const claimedJobs = jobs.filter(job => job.status === 'Claimed');
  const submittedJobs = jobs.filter(job => job.status === 'Submitted');

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
                <h1 className="text-2xl font-bold text-primary">Job Management</h1>
                <p className="text-sm text-muted-foreground">Review and manage cleaning jobs</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Submitted Jobs Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Jobs Awaiting Review ({submittedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submittedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs submitted for review.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submittedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(job.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.properties?.address1 || job.notes}</div>
                          <div className="text-sm text-muted-foreground">
                            {job.properties?.beds}BR / {job.properties?.baths}BA
                          </div>
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
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {job.contractors?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {job.submitted_at ? new Date(job.submitted_at).toLocaleDateString() : 'N/A'}
                        </div>
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

        {/* Claimed Jobs Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <HandIcon className="h-5 w-5 mr-2" />
              Claimed Jobs ({claimedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {claimedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs claimed by contractors.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Claimed By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(job.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.properties?.address1 || job.notes}</div>
                          <div className="text-sm text-muted-foreground">
                            {job.properties?.beds}BR / {job.properties?.baths}BA
                          </div>
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
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {job.claimed_contractor?.name || 'Unknown'}
                        </div>
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

        {/* Pending Jobs Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              All Pending Jobs ({pendingJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading jobs...</div>
            ) : pendingJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending jobs found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(job.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{job.properties?.address1}</div>
                          <div className="text-sm text-muted-foreground">
                            {job.properties?.beds}BR / {job.properties?.baths}BA
                          </div>
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
                          ${(job.price_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.contractors ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {job.contractors.name}
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
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

        {/* All Jobs Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              All Jobs ({jobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Status</TableHead>
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
                          <div className="font-medium">{job.properties?.address1 || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">
                            {job.properties?.beds}BR / {job.properties?.baths}BA
                          </div>
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
                          ${(job.price_cents / 100).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.contractors ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {job.contractors.name}
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(job.status)}
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

export default JobManagement;