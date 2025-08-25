import React from "react";
import { Link } from "react-router-dom";
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

const AdminDashboard = () => {
  // Mock data - replace with real data from Supabase
  const stats = {
    totalJobs: 127,
    activeContractors: 8,
    pendingJobs: 15,
    monthlyRevenue: 12450,
    completedJobs: 89,
    pendingPayments: 6
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
              <CleanNamiButton variant="hero" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Contractor
              </CleanNamiButton>
              <CleanNamiButton variant="ocean" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View All Contractors
              </CleanNamiButton>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-primary">Job Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CleanNamiButton variant="success" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Review Pending Jobs ({stats.pendingJobs})
              </CleanNamiButton>
              <CleanNamiButton variant="warning" className="w-full">
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payments ({stats.pendingPayments})
              </CleanNamiButton>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="text-primary">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-hero rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">Job #127</Badge>
                  <span className="text-sm text-muted-foreground">
                    Residential cleaning completed by Sarah Johnson
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-hero rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">Payment</Badge>
                  <span className="text-sm text-muted-foreground">
                    $180 payment processed for VR cleaning
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">4 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-hero rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">New User</Badge>
                  <span className="text-sm text-muted-foreground">
                    Mike Davis joined as contractor in Daytona Beach
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;