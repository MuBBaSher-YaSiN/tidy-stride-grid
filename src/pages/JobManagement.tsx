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
  User
} from "lucide-react";

interface Job {
  id: string;
  date: string;
  status: string;
  price_cents: number;
  payout_cents: number;
  city: string;
  notes?: string;
  properties?: {
    address1: string;
    beds: number;
    baths: number;
  };
  contractors?: {
    name: string;
  };
}

const JobManagement = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          properties (address1, beds, baths),
          contractors (name)
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'assigned':
        return <Badge variant="outline">Assigned</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingJobs = jobs.filter(job => job.status.toLowerCase() === 'new');

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
        {/* Pending Jobs Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Pending Jobs ({pendingJobs.length})
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
                        <CleanNamiButton 
                          variant="success" 
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'Assigned')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </CleanNamiButton>
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