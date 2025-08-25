import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  LogOut,
  Plus,
  Eye,
  TrendingUp
} from "lucide-react";

interface DashboardStats {
  totalJobs: number;
  activeContractors: number;
  pendingJobs: number;
  monthlyRevenue: number;
  completedJobs: number;
  pendingPayments: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeContractors: 0,
    pendingJobs: 0,
    monthlyRevenue: 0,
    completedJobs: 0,
    pendingPayments: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs data
      const { data: jobs } = await supabase.from('jobs').select('*');
      const { data: contractors } = await supabase.from('contractors').select('*');
      const { data: payments } = await supabase.from('payment_events').select('*');

      const totalJobs = jobs?.length || 0;
      const activeContractors = contractors?.length || 0;
      const pendingJobs = jobs?.filter(job => job.status === 'New').length || 0;
      const completedJobs = jobs?.filter(job => job.status === 'Completed').length || 0;
      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      
      // Calculate monthly revenue from completed jobs
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = jobs?.filter(job => {
        const jobDate = new Date(job.date);
        return jobDate.getMonth() === currentMonth && 
               jobDate.getFullYear() === currentYear &&
               job.status === 'Completed';
      }).reduce((sum, job) => sum + (job.price_cents / 100), 0) || 0;

      setStats({
        totalJobs,
        activeContractors,
        pendingJobs,
        monthlyRevenue,
        completedJobs,
        pendingPayments
      });

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      if (jobs && jobs.length > 0) {
        const recentJobs = jobs
          .filter(job => job.status === 'Completed')
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 2);
        
        recentJobs.forEach((job, index) => {
          activities.push({
            id: `job-${job.id}`,
            type: 'Job',
            description: `Job #${job.id.slice(0, 8)} completed in ${job.city}`,
            timestamp: new Date(job.updated_at || job.created_at).toLocaleString()
          });
        });
      }

      if (payments && payments.length > 0) {
        const recentPayments = payments
          .filter(p => p.status === 'completed')
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 1);
        
        recentPayments.forEach(payment => {
          activities.push({
            id: `payment-${payment.id}`,
            type: 'Payment',
            description: `$${(payment.amount_cents / 100).toFixed(2)} payment processed`,
            timestamp: new Date(payment.updated_at || payment.created_at).toLocaleString()
          });
        });
      }

      if (contractors && contractors.length > 0) {
        const recentContractors = contractors
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 1);
        
        recentContractors.forEach(contractor => {
          activities.push({
            id: `contractor-${contractor.id}`,
            type: 'New User',
            description: `${contractor.name} joined as contractor in ${contractor.city}`,
            timestamp: new Date(contractor.created_at).toLocaleString()
          });
        });
      }

      setRecentActivity(activities.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Admin Navigation */}
      <nav className="bg-card shadow-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">CleanNami Admin</h1>
                <p className="text-sm text-muted-foreground">Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
                Super Admin
              </Badge>
              <Link to="/admin">
                <CleanNamiButton variant="ghost" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </CleanNamiButton>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeContractors}</div>
              <p className="text-xs text-muted-foreground">
                2 new this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${stats.monthlyRevenue}</div>
              <p className="text-xs text-muted-foreground">
                +18% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground">
                Requires approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-primary">Contractor Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/admin/contractors">
                <CleanNamiButton variant="hero" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contractor
                </CleanNamiButton>
              </Link>
              <Link to="/admin/contractors">
                <CleanNamiButton variant="ocean" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  View All Contractors
                </CleanNamiButton>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-primary">Job Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/admin/jobs">
                <CleanNamiButton variant="success" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Review Pending Jobs ({stats.pendingJobs})
                </CleanNamiButton>
              </Link>
              <Link to="/admin/payments">
                <CleanNamiButton variant="warning" className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Process Payments ({stats.pendingPayments})
                </CleanNamiButton>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading recent activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity found.
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gradient-hero rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{activity.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {activity.description}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;