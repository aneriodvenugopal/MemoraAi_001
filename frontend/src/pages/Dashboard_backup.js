import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Building2, Users, BarChart3, Home } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect customers to their dedicated portal
  useEffect(() => {
    if (user?.role === 'customer') {
      navigate('/customer-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'tenant_admin':
        return <TenantAdminDashboard />;
      case 'staff':
        return <StaffDashboard />;
      case 'customer':
        return null; // Will be redirected
      default:
        return <DefaultDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RealApex</h1>
              <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {getDashboardContent()}
      </main>
    </div>
  );
};

// Super Admin Dashboard
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Super Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Building2} title="Total Tenants" value="0" color="blue" />
        <StatCard icon={Users} title="Total Users" value="0" color="green" />
        <StatCard icon={BarChart3} title="Active Subscriptions" value="0" color="purple" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/customer-dashboard')}>
          <CardHeader>
            <CardTitle>Customer Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Preview customer experience</p>
            <Button className="mt-4" onClick={() => navigate('/customer-dashboard')}>
              View Portal
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No recent activity</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Tenant Admin Dashboard
const TenantAdminDashboard = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tenant Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Building2} title="Projects" value="0" color="blue" onClick={() => navigate('/projects')} />
        <StatCard icon={Users} title="Leads" value="0" color="green" onClick={() => navigate('/leads')} />
        <StatCard icon={BarChart3} title="Bookings" value="0" color="purple" onClick={() => navigate('/bookings')} />
        <StatCard icon={Users} title="Team" value="0" color="orange" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/projects')}>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Manage your real estate projects</p>
            <Button className="mt-4" onClick={() => navigate('/projects')}>
              View Projects
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/leads')}>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Manage and track your leads</p>
            <Button className="mt-4" onClick={() => navigate('/leads')}>
              View Leads
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/bookings')}>
          <CardHeader>
            <CardTitle>Bookings & Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Track bookings and payments</p>
            <Button className="mt-4" onClick={() => navigate('/bookings')}>
              View Bookings
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/reports')}>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">View insights and reports</p>
            <Button className="mt-4" onClick={() => navigate('/reports')}>
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/users')}>
          <CardHeader>
            <CardTitle>Users & Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Manage team members and roles</p>
            <Button className="mt-4" onClick={() => navigate('/users')}>
              Manage Users
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/customer-dashboard')}>
          <CardHeader>
            <CardTitle>Customer Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">View customer experience</p>
            <Button className="mt-4" onClick={() => navigate('/customer-dashboard')}>
              View Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Staff Dashboard
const StaffDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Staff Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} title="My Leads" value="0" color="blue" />
        <StatCard icon={BarChart3} title="Conversions" value="0" color="green" />
        <StatCard icon={Building2} title="Follow-ups Today" value="0" color="purple" />
      </div>
    </div>
  );
};

// Default Dashboard
const DefaultDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to RealApex</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Your dashboard is being set up...</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
