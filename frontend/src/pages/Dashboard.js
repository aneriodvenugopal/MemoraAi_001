import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Building2, Users, BarChart3, FileText, UserCog, Home, Layers, MessageSquare, MapPin, Wallet, Shield, Tags, FolderTree, Settings, Bot, DollarSign, CreditCard, TrendingUp, Banknote, Mail, Receipt, Star, Stethoscope, Scissors, Flame, Brain, Phone } from 'lucide-react';
import NotificationCenter from '../components/notifications/NotificationCenter';
import PageInfoModal from '../components/PageInfoModal';
import MemoraAILogo from '../components/MemoraAILogo';
import CategoryDashboardWidgets from '../components/CategoryDashboardWidgets';

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
        return null;
      default:
        return <DefaultDashboard />;
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MemoraAILogo size="sm" showCaption={true} showBrand={true} />
              <div className="hidden sm:block border-l pl-4 border-gray-200">
                <p className="text-xs text-gray-500">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-ocean-primary capitalize">{typeof user?.role === 'string' ? user.role.replace('_', ' ') : 'User'}</p>
              </div>
              <Button 
                onClick={logout}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-light hover:to-ocean-secondary-light text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {getDashboardContent()}
      </main>

      {/* Page Info Modal */}
      <PageInfoModal
        title="Dashboard"
        description="Central hub for managing your real estate business. Role-based dashboards provide quick access to key metrics, navigation to all modules, and real-time insights tailored to your permissions."
        features={[
          "Role-based dashboard views (Super Admin, Tenant Admin, Staff, Customer)",
          "Quick access cards to all major modules (Projects, Leads, Bookings, Users)",
          "Real-time statistics and KPI tracking",
          "SaaS Admin Dashboard access for platform management (select users only)",
          "IncomeLands Marketplace integration for agent management",
          "Chat Management for lead conversations",
          "Customer Portal preview for testing user experience",
          "System Settings access: Master Categories, Roles, Bank Accounts",
          "Category Management: Manage tenant-specific property categories",
          "Notification Center for real-time updates",
          "Animated gradient background for premium UX",
          "Responsive design with mobile-optimized navigation"
        ]}
        technologies={[
          "React.js",
          "React Router",
          "Tailwind CSS",
          "Shadcn UI",
          "FastAPI Backend",
          "MongoDB",
          "Role-Based Access Control",
          "Real-time Analytics API"
        ]}
        implementations={[
          {
            title: "Role-Based Dashboard System",
            description: "Implemented dynamic dashboard content based on user roles. Super Admins see system-wide controls, Tenant Admins see business metrics with 4 KPI cards (Projects, Leads, Bookings, Team), Staff see lead-focused metrics, and Customers are redirected to dedicated portal. Each role gets tailored navigation and action cards."
          },
          {
            title: "SaaS Admin Controls",
            description: "Special access for SaaS Admin (phone: 9948303060) to manage entire platform. Includes Package Management, Tenant Management, System Settings, Master Categories, and IncomeLands Marketplace. Gradient-styled cards distinguish admin-only features."
          },
          {
            title: "Quick Action Navigation",
            description: "Action cards with gradient backgrounds provide one-click navigation to all modules. Each card shows icon, title, description, and uses hover effects for better UX. Cards organized in grids with responsive breakpoints."
          },
          {
            title: "Real-Time Statistics",
            description: "Dashboard fetches live data from analytics API for Tenant Admins. Displays total projects, leads, bookings, and team size with animated loading states. Stats update automatically when navigating back to dashboard."
          },
          {
            title: "System Settings Integration",
            description: "Dedicated sections for Settings & Management and Category Management. Includes access to Bank Accounts, Role Assignments, Master/Tenant Categories with color-coded gradient cards for visual hierarchy."
          }
        ]}
      />
    </div>
  );
};

// Super Admin Dashboard
const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = React.useState({
    tenants: 0,
    users: 0,
    subscriptions: 0
  });
  const [loading, setLoading] = React.useState(true);
  
  // Check if user is SaaS admin (phone: 9948303060)
  const isSaaSAdmin = user?.phone === '9948303060';
  
  React.useEffect(() => {
    fetchAdminStats();
  }, []);
  
  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      // Try SaaS dashboard first
      const saasResponse = await fetch(`${apiUrl}/api/saas/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (saasResponse.ok) {
        const data = await saasResponse.json();
        setStats({
          tenants: data.overview?.total_tenants || 0,
          users: data.overview?.active_tenants || 0,
          subscriptions: data.overview?.active_tenants || 0
        });
      } else {
        // Fallback to analytics
        const analyticsResponse = await fetch(`${apiUrl}/api/analytics/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (analyticsResponse.ok) {
          const data = await analyticsResponse.json();
          setStats({
            tenants: 1,
            users: data.overview?.total_leads || 0,
            subscriptions: data.overview?.total_bookings || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={Building2} 
          title="Total Tenants" 
          value={loading ? '...' : stats.tenants.toString()} 
          gradient="from-ocean-primary to-ocean-secondary"
          onClick={() => navigate('/admin/saas-dashboard')}
        />
        <StatCard 
          icon={Users} 
          title="Active Tenants" 
          value={loading ? '...' : stats.users.toString()} 
          gradient="from-ocean-secondary to-ocean-accent"
          onClick={() => navigate('/admin/saas-dashboard')}
        />
        <StatCard 
          icon={BarChart3} 
          title="Active Subscriptions" 
          value={loading ? '...' : stats.subscriptions.toString()} 
          gradient="from-ocean-accent to-ocean-primary"
          onClick={() => navigate('/admin/saas-dashboard')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isSaaSAdmin && (
          <>
            <ActionCard
              icon={Building2}
              title="SaaS Admin Dashboard"
              description="Manage tenants, packages & analytics"
              onClick={() => navigate('/admin/saas-dashboard')}
              gradient="from-purple-500 to-pink-500"
            />
            <ActionCard
              icon={MapPin}
              title="IncomeLands Marketplace"
              description="Monitor agents, leads & commissions"
              onClick={() => navigate('/admin/incomelands')}
              gradient="from-blue-500 to-purple-500"
            />
          </>
        )}
        <ActionCard
          icon={MessageSquare}
          title="Chat Management"
          description="View conversations & manage leads"
          onClick={() => navigate('/admin/chats')}
          gradient="from-blue-500 to-cyan-500"
        />
        <ActionCard
          icon={Bot}
          title="AI Agents Hub"
          description="Automation agents for business operations"
          onClick={() => navigate('/ai-agents')}
          gradient="from-purple-500 to-pink-500"
        />
        <ActionCard
          icon={Banknote}
          title="Stripe Payments"
          description="Online payments & transaction history"
          onClick={() => navigate('/stripe-payments')}
          gradient="from-indigo-500 to-blue-500"
        />
        <ActionCard
          icon={Mail}
          title="Email Management"
          description="Send and track transactional emails"
          onClick={() => navigate('/email-management')}
          gradient="from-blue-500 to-cyan-500"
        />
        <ActionCard
          icon={Receipt}
          title="Billing & Subscription"
          description="Manage your plan and view invoices"
          onClick={() => navigate('/billing')}
          gradient="from-indigo-500 to-purple-500"
        />
        <ActionCard
          icon={MapPin}
          title="Block Locations"
          description="Configure GPS locations for property blocks"
          onClick={() => navigate('/block-locations')}
          gradient="from-emerald-500 to-teal-500"
        />
        <ActionCard
          icon={Home}
          title="Customer Portal"
          description="Preview customer experience"
          onClick={() => navigate('/customer-dashboard')}
        />
      </div>
      
      {/* System Settings Section - SaaS Admin Only */}
      {isSaaSAdmin && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActionCard
              icon={Tags}
              title="Master Categories"
              description="Manage system-wide property categories"
              onClick={() => navigate('/settings/master-categories')}
              gradient="from-indigo-500 to-purple-500"
            />
            <ActionCard
              icon={FolderTree}
              title="Master Subcategories"
              description="Manage system-wide subcategories"
              onClick={() => navigate('/settings/master-subcategories')}
              gradient="from-purple-500 to-fuchsia-500"
            />
            <ActionCard
              icon={Shield}
              title="System Roles"
              description="Manage system-wide roles & permissions"
              onClick={() => navigate('/settings/system-roles')}
              gradient="from-red-500 to-rose-500"
            />
          </div>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-ocean-primary">Recent Activity</CardTitle>
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
  const [stats, setStats] = React.useState({
    projects: 0,
    leads: 0,
    bookings: 0,
    team: 0
  });
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    fetchDashboardStats();
  }, []);
  
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      // Fetch analytics data (this endpoint returns comprehensive stats)
      const response = await fetch(`${apiUrl}/api/analytics/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const overview = data.overview || {};
        
        setStats({
          projects: overview.total_projects || data.total_projects || 0,
          leads: overview.total_leads || 0,
          bookings: overview.total_bookings || 0,
          team: overview.total_team || data.total_team || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">MemoraAI Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={Building2} 
          title="Projects" 
          value={loading ? '...' : stats.projects.toString()} 
          gradient="from-ocean-primary to-ocean-secondary"
          onClick={() => navigate('/projects')} 
        />
        <StatCard 
          icon={Users} 
          title="Leads" 
          value={loading ? '...' : stats.leads.toString()} 
          gradient="from-ocean-secondary to-ocean-accent"
          onClick={() => navigate('/leads')} 
        />
        <StatCard 
          icon={BarChart3} 
          title="Bookings" 
          value={loading ? '...' : stats.bookings.toString()} 
          gradient="from-ocean-accent to-ocean-success"
          onClick={() => navigate('/bookings')} 
        />
        <StatCard 
          icon={Users} 
          title="Team" 
          value={loading ? '...' : stats.team.toString()} 
          gradient="from-ocean-success to-ocean-primary"
        />
      </div>

      {/* Category-Specific Smart Widgets */}
      <CategoryDashboardWidgets />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          icon={Building2}
          title="Projects"
          description="Manage your real estate projects"
          onClick={() => navigate('/projects')}
        />
{/* Layouts Library removed - Layouts now created from Projects only */}
        <ActionCard
          icon={Users}
          title="Leads"
          description="Manage and track your leads"
          onClick={() => navigate('/leads')}
        />
        <ActionCard
          icon={BarChart3}
          title="Bookings & Sales"
          description="Track bookings and payments"
          onClick={() => navigate('/bookings')}
        />
        <ActionCard
          icon={FileText}
          title="Reports & Analytics"
          description="View insights and reports"
          onClick={() => navigate('/reports')}
        />
        <ActionCard
          icon={DollarSign}
          title="Financial Management"
          description="Track payments and expenses"
          onClick={() => navigate('/financials')}
        />
        <ActionCard
          icon={CreditCard}
          title="Payments Dashboard"
          description="Track collections, overdue & targets"
          onClick={() => navigate('/payments-dashboard')}
          gradient="from-green-500 to-emerald-500"
        />
        <ActionCard
          icon={TrendingUp}
          title="Commission Analytics"
          description="Track earnings, performance & payouts"
          onClick={() => navigate('/commission-analytics')}
          gradient="from-purple-500 to-violet-500"
        />
        <ActionCard
          icon={Banknote}
          title="Stripe Payments"
          description="Online payments & transaction history"
          onClick={() => navigate('/stripe-payments')}
          gradient="from-indigo-500 to-blue-500"
        />
        <ActionCard
          icon={Bot}
          title="AI Agents"
          description="AI-powered assistants for your business"
          onClick={() => navigate('/ai-agents')}
        />
        <ActionCard
          icon={MessageSquare}
          title="SMS Automation"
          description="Automated SMS for leads & bookings"
          onClick={() => navigate('/sms')}
        />
        <ActionCard
          icon={Mail}
          title="Email Management"
          description="Send and track transactional emails"
          onClick={() => navigate('/email-management')}
          gradient="from-blue-500 to-indigo-500"
        />
        <ActionCard
          icon={Receipt}
          title="Billing & Subscription"
          description="Manage your plan and view invoices"
          onClick={() => navigate('/billing')}
          gradient="from-indigo-500 to-purple-500"
        />
        <ActionCard
          icon={MapPin}
          title="Block Locations"
          description="Configure GPS locations for property blocks"
          onClick={() => navigate('/block-locations')}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>
      
      {/* Settings & Management Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Settings & Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            icon={UserCog}
            title="Users & Staff"
            description="Manage team members and roles"
            onClick={() => navigate('/users')}
            gradient="from-blue-500 to-cyan-500"
          />
          <ActionCard
            icon={Shield}
            title="Role Assignments"
            description="Manage multi-role assignments & permissions"
            onClick={() => navigate('/settings/role-assignments')}
            gradient="from-purple-500 to-pink-500"
          />
          <ActionCard
            icon={Wallet}
            title="Bank Accounts"
            description="Project-wise banking & accounts"
            onClick={() => navigate('/settings/bank-accounts')}
            gradient="from-green-500 to-emerald-500"
          />
          <ActionCard
            icon={Users}
            title="Vendors Management"
            description="Manage vendors & payment transfers"
            onClick={() => navigate('/vendors')}
            gradient="from-orange-500 to-red-500"
          />
          <ActionCard
            icon={TrendingUp}
            title="Marketing Agents"
            description="Agents, commissions & payouts"
            onClick={() => navigate('/marketing-agents')}
            gradient="from-cyan-500 to-blue-500"
          />
          <ActionCard
            icon={Home}
            title="Customer Portal"
            description="View customer experience"
            onClick={() => navigate('/customer-dashboard')}
            gradient="from-orange-500 to-amber-500"
          />
        </div>
      </div>
      
      {/* Category Management Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          MemoraAI - Multi-Category Business
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            icon={Star}
            title="Category Setup"
            description="Select business categories & manage AI-suggested services"
            onClick={() => navigate('/category-setup')}
            gradient="from-purple-500 to-indigo-500"
          />
          <ActionCard
            icon={Flame}
            title="Hot Sales Mode"
            description="Manual hot leads & AI sales alerts"
            onClick={() => navigate('/hot-sales')}
            gradient="from-orange-500 to-red-500"
          />
          <ActionCard
            icon={Phone}
            title="WhatsApp Setup"
            description="Self-service WABA configuration & templates"
            onClick={() => navigate('/waba-setup')}
            gradient="from-green-500 to-emerald-500"
          />
          <ActionCard
            icon={MessageSquare}
            title="WhatsApp CRM"
            description="Manage WhatsApp leads & conversations"
            onClick={() => navigate('/whatsapp-crm')}
            gradient="from-green-600 to-teal-500"
          />
        </div>
      </div>

      {/* Original Category Management Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FolderTree className="w-5 h-5" />
          Category Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard
            icon={Tags}
            title="Master Categories"
            description="System-wide property categories"
            onClick={() => navigate('/settings/master-categories')}
            gradient="from-indigo-500 to-purple-500"
          />
          <ActionCard
            icon={Tags}
            title="Master Subcategories"
            description="System-wide property subcategories"
            onClick={() => navigate('/settings/master-subcategories')}
            gradient="from-purple-500 to-fuchsia-500"
          />
          <ActionCard
            icon={Building2}
            title="Tenant Categories"
            description="Your custom property categories"
            onClick={() => navigate('/settings/tenant-categories')}
            gradient="from-cyan-500 to-blue-500"
          />
          <ActionCard
            icon={Building2}
            title="Tenant Subcategories"
            description="Your custom property subcategories"
            onClick={() => navigate('/settings/tenant-subcategories')}
            gradient="from-blue-500 to-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

// Staff Dashboard
const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = React.useState({
    myLeads: 0,
    conversions: 0,
    followUps: 0
  });
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    fetchStaffStats();
  }, []);
  
  const fetchStaffStats = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      
      // Fetch leads assigned to this staff
      const leadsResponse = await fetch(`${apiUrl}/api/leads?assigned_to=${user?.id}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (leadsResponse.ok) {
        const data = await leadsResponse.json();
        const leads = data.leads || [];
        const today = new Date().toISOString().split('T')[0];
        
        setStats({
          myLeads: leads.length,
          conversions: leads.filter(l => l.is_converted).length,
          followUps: leads.filter(l => l.next_followup_date && l.next_followup_date.startsWith(today)).length
        });
      }
    } catch (error) {
      console.error('Failed to fetch staff stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Staff Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={Users} 
          title="My Leads" 
          value={loading ? '...' : stats.myLeads.toString()} 
          gradient="from-ocean-primary to-ocean-secondary"
          onClick={() => navigate('/leads')}
        />
        <StatCard 
          icon={BarChart3} 
          title="Conversions" 
          value={loading ? '...' : stats.conversions.toString()} 
          gradient="from-ocean-secondary to-ocean-success"
          onClick={() => navigate('/bookings')}
        />
        <StatCard 
          icon={Building2} 
          title="Follow-ups Today" 
          value={loading ? '...' : stats.followUps.toString()} 
          gradient="from-ocean-success to-ocean-accent"
          onClick={() => navigate('/leads')}
        />
      </div>
    </div>
  );
};

// Default Dashboard
const DefaultDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-ocean-primary">Welcome to MemoraAI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Your dashboard is being set up...</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, title, value, gradient, onClick }) => {
  return (
    <Card 
      className={`glass-card hover-lift ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
          </div>
          <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Action Card Component
const ActionCard = ({ icon: Icon, title, description, onClick, gradient = "from-ocean-primary to-ocean-secondary" }) => {
  return (
    <Card className="glass-card hover-lift cursor-pointer" onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;