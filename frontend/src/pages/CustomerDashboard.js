import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Home, CreditCard, Calendar, AlertCircle, DollarSign, Building, CheckCircle, LogOut, 
  ArrowLeft, Download, FileText, FolderOpen, Folder, ChevronRight, ChevronDown,
  MapPin, IndianRupee, TrendingUp, Banknote, Send, RefreshCw, Clock, Loader2,
  Copy, ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get customer portal session from localStorage
const getCustomerSession = () => {
  try {
    const session = localStorage.getItem('customerPortalSession');
    if (!session) return null;
    const parsed = JSON.parse(session);
    if (new Date(parsed.expires_at) < new Date()) {
      localStorage.removeItem('customerPortalSession');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [resaleRequests, setResaleRequests] = useState([]);
  const [showResaleDialog, setShowResaleDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [resaleForm, setResaleForm] = useState({
    asking_price: '',
    reason: '',
    notes: ''
  });
  const [propertyResaleStatus, setPropertyResaleStatus] = useState({});
  
  // Customer portal specific state
  const [customerSession, setCustomerSession] = useState(getCustomerSession());
  const [projectTree, setProjectTree] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paymentItem, setPaymentItem] = useState(null);

  // Determine if using customer portal session
  const isCustomerPortal = !!customerSession && !user;
  const currentUser = isCustomerPortal ? customerSession.customer : user;
  
  // Headers for customer portal API calls
  const portalHeaders = customerSession ? {
    'X-Portal-Session': customerSession.session_id,
    'Content-Type': 'application/json'
  } : {};

  // Helper function to safely format numbers
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0';
    }
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  useEffect(() => {
    loadAllData();
  }, [isCustomerPortal]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (isCustomerPortal) {
        // Use customer portal APIs
        await Promise.all([
          loadPortalDashboard(),
          loadPortalProperties(),
          loadPortalPayments(),
          loadPortalSchedules()
        ]);
      } else {
        // Use regular customer service APIs
        await Promise.all([
          loadDashboard(),
          loadBookings(),
          loadPayments(),
          loadProperties(),
          loadPaymentSchedules(),
          loadResaleRequests()
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Portal-specific data loaders
  const loadPortalDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customer-portal/dashboard`, { headers: portalHeaders });
      if (res.ok) {
        const data = await res.json();
        setDashboardData({
          overview: data.overview,
          properties: [],
          upcoming_payments: data.upcoming_payments || [],
          recent_payments: data.recent_payments || []
        });
      }
    } catch (error) {
      console.error('Portal dashboard error:', error);
    }
  };

  const loadPortalProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customer-portal/properties`, { headers: portalHeaders });
      if (res.ok) {
        const data = await res.json();
        const props = data.properties || [];
        setProperties(props);
        
        // Build project tree
        const projectMap = new Map();
        props.forEach(prop => {
          const projectId = prop.project?.id || 'unknown';
          const projectName = prop.project?.name || 'Other Properties';
          
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              id: projectId,
              name: projectName,
              location: prop.project?.location,
              children: [],
              propertyCount: 0
            });
          }
          
          const project = projectMap.get(projectId);
          project.children.push({
            ...prop,
            paymentProgress: Math.round((prop.booking?.paid_amount / prop.booking?.total_amount) * 100) || 0
          });
          project.propertyCount++;
        });
        
        setProjectTree(Array.from(projectMap.values()));
        
        // Auto-expand first project
        if (projectMap.size > 0) {
          const firstProject = Array.from(projectMap.values())[0];
          setExpandedProjects(new Set([firstProject.id]));
          if (firstProject.children.length > 0) {
            setSelectedProperty(firstProject.children[0]);
          }
        }
      }
    } catch (error) {
      console.error('Portal properties error:', error);
    }
  };

  const loadPortalPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customer-portal/payments`, { headers: portalHeaders });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Portal payments error:', error);
    }
  };

  const loadPortalSchedules = async () => {
    try {
      const res = await fetch(`${API_URL}/api/customer-portal/payment-schedule`, { headers: portalHeaders });
      if (res.ok) {
        const data = await res.json();
        setPaymentSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Portal schedules error:', error);
    }
  };

  // Regular service-based loaders
  const loadDashboard = async () => {
    try {
      const data = await customerService.getDashboard();
      if (data && data.overview) {
        setDashboardData(data);
        if (data.properties && data.properties.length > 0) {
          setProperties(data.properties);
        }
      } else {
        setDashboardData({
          overview: { total_bookings: 0, active_bookings: 0, total_invested: 0, total_paid: 0, total_pending: 0, overdue_amount: 0, overdue_count: 0 },
          properties: [], upcoming_payments: [], recent_payments: []
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setDashboardData({
        overview: { total_bookings: 0, active_bookings: 0, total_invested: 0, total_paid: 0, total_pending: 0, overdue_amount: 0, overdue_count: 0 },
        properties: [], upcoming_payments: [], recent_payments: []
      });
    }
  };

  const loadBookings = async () => {
    try {
      const data = await customerService.getBookings();
      console.log('Bookings data:', data);
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await customerService.getPayments();
      console.log('Payments data:', data);
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    }
  };

  const loadProperties = async () => {
    try {
      const data = await customerService.getProperties();
      console.log('Properties API response:', data);
      console.log('Properties array length:', data?.properties?.length || 0);
      if (data?.properties && data.properties.length > 0) {
        console.log('First property sample:', data.properties[0]);
      }
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to load properties';
      toast.error(errorMsg);
      setProperties([]);
    }
  };

  const loadPaymentSchedules = async () => {
    try {
      const data = await customerService.getPaymentSchedules();
      console.log('Payment schedules API response:', data);
      console.log('Schedules array length:', data?.schedules?.length || 0);
      if (data?.schedules && data.schedules.length > 0) {
        console.log('First schedule sample:', data.schedules[0]);
      }
      setPaymentSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : 'Failed to load payment schedules';
      toast.error(errorMsg);
      setPaymentSchedules([]);
    }
  };

  const loadResaleRequests = async () => {
    try {
      const data = await customerService.getResaleRequests();
      setResaleRequests(data.requests || []);
      
      // Track which properties have resale requests
      const statusMap = {};
      (data.requests || []).forEach(request => {
        if (request.property_id) {
          statusMap[request.property_id] = {
            hasRequest: true,
            status: request.status,
            requestId: request.id
          };
        }
      });
      setPropertyResaleStatus(statusMap);
    } catch (error) {
      console.error('Error loading resale requests:', error);
    }
  };

  const handleResaleRequest = async () => {
    if (!selectedProperty || !resaleForm.asking_price) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!selectedProperty.booking_id) {
      toast.error('No booking record found for this property. Please contact support.');
      return;
    }

    console.log('Submitting resale request:', {
      property_id: selectedProperty.id,
      booking_id: selectedProperty.booking_id,
      asking_price: resaleForm.asking_price
    });

    try {
      await customerService.createResaleRequest({
        property_id: selectedProperty.id,
        booking_id: selectedProperty.booking_id,
        asking_price: parseFloat(resaleForm.asking_price),
        reason: resaleForm.reason,
        notes: resaleForm.notes
      });
      toast.success('Resale request submitted successfully!');
      setShowResaleDialog(false);
      setResaleForm({ asking_price: '', reason: '', notes: '' });
      setSelectedProperty(null);
      loadResaleRequests();
    } catch (error) {
      console.error('Error submitting resale request:', error);
      const errorMsg = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : error.message || 'Failed to submit resale request';
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.role !== 'customer' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="text-ocean-primary hover:bg-ocean-primary/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-primary to-ocean-secondary flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">MemoraAI</h1>
                <p className="text-xs text-gray-500">Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                <p className="text-xs text-ocean-primary capitalize">{isCustomerPortal ? 'Customer' : (typeof currentUser?.role === 'string' ? currentUser.role.replace('_', ' ') : 'Customer')}</p>
              </div>
              <Button 
                onClick={() => {
                  if (isCustomerPortal) {
                    // Logout from customer portal
                    fetch(`${API_URL}/api/customer-portal/logout`, { method: 'POST', headers: portalHeaders });
                    localStorage.removeItem('customerPortalSession');
                    navigate('/login');
                  } else {
                    logout();
                  }
                }}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-light hover:to-ocean-secondary-light text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 relative z-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
          Welcome, {currentUser?.name}!
        </h1>
        <p className="text-gray-600 mt-1">Manage your properties, bookings and payments</p>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="glass-card hover-lift cursor-pointer transition-all hover:shadow-xl hover:scale-105" 
            onClick={() => {
              setActiveTab('bookings');
              setFilterStatus('active');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                  <p className="text-3xl font-bold mt-2 text-ocean-primary">
                    {dashboardData.overview.active_bookings}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total: {dashboardData.overview.total_bookings}</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-ocean-primary to-ocean-secondary shadow-lg">
                  <Building className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="glass-card hover-lift cursor-pointer transition-all hover:shadow-xl hover:scale-105"
            onClick={() => {
              console.log('Total Invested card clicked - navigating to properties tab');
              console.log('Properties data:', properties);
              setActiveTab('properties');
              setFilterStatus('all');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invested</p>
                  <p className="text-3xl font-bold mt-2 text-ocean-secondary">
                    ₹{formatCurrency(dashboardData.overview.total_invested)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Portfolio Value</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-ocean-secondary to-ocean-accent shadow-lg">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="glass-card hover-lift cursor-pointer transition-all hover:shadow-xl hover:scale-105"
            onClick={() => {
              console.log('Pending Payment card clicked - navigating to schedules tab (pending filter)');
              console.log('Payment Schedules data:', paymentSchedules);
              console.log('Dashboard pending amount:', dashboardData.overview.total_pending);
              setActiveTab('schedules');
              setFilterStatus('pending');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600">
                    ₹{formatCurrency(dashboardData.overview.total_pending)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Paid: ₹{formatCurrency(dashboardData.overview.total_paid)}</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="glass-card hover-lift cursor-pointer transition-all hover:shadow-xl hover:scale-105"
            onClick={() => {
              console.log('Overdue Amount card clicked - navigating to schedules tab');
              console.log('Payment Schedules data:', paymentSchedules);
              console.log('Dashboard overdue count:', dashboardData.overview.overdue_count);
              console.log('Dashboard overdue amount:', dashboardData.overview.overdue_amount);
              setActiveTab('schedules');
              setFilterStatus('overdue');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">
                    {dashboardData.overview.overdue_count}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {dashboardData.overview.overdue_count > 0 
                      ? `₹${formatCurrency(dashboardData.overview.overdue_amount)}` 
                      : 'No overdue'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 shadow-lg">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass-tabs p-1 h-auto">
          <TabsTrigger value="overview" className="glass-tab">Overview</TabsTrigger>
          <TabsTrigger value="bookings" className="glass-tab">My Bookings</TabsTrigger>
          <TabsTrigger value="payments" className="glass-tab">Payments</TabsTrigger>
          <TabsTrigger value="properties" className="glass-tab">My Properties</TabsTrigger>
          <TabsTrigger value="schedules" className="glass-tab">Payment Schedule</TabsTrigger>
          <TabsTrigger value="resale" className="glass-tab">Resale Requests</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Upcoming Payments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-ocean-primary">
                <Calendar className="h-5 w-5" />
                Upcoming Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.upcoming_payments?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcoming_payments.map((schedule, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">₹{formatCurrency(schedule.amount)}</p>
                        <p className="text-sm text-gray-600">Due: {schedule.due_date}</p>
                      </div>
                      <Badge>{schedule.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming payments</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recent_payments?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recent_payments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">₹{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-600">{payment.payment_date}</p>
                      </div>
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No payment history</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-ocean-primary">
                  My Bookings ({bookings.filter(b => filterStatus === 'all' || (filterStatus === 'active' && b.status !== 'cancelled')).length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('active')}
                  >
                    Active
                  </Button>
                  <Button 
                    variant={filterStatus === 'cancelled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('cancelled')}
                  >
                    Cancelled
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings
                  .filter(b => {
                    if (filterStatus === 'all') return true;
                    if (filterStatus === 'active') return b.status !== 'cancelled';
                    return b.status === filterStatus;
                  })
                  .map((booking) => (
                  <Card 
                    key={booking.id} 
                    className="border cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingDetail(true);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-semibold">{booking.property?.property_number || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{booking.project?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="font-semibold">₹{formatCurrency(booking.total_amount)}</p>
                          <p className="text-sm text-gray-600">Paid: ₹{formatCurrency(booking.paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge>{booking.status}</Badge>
                          <p className="text-sm text-gray-600 mt-1">{booking.booking_date}</p>
                        </div>
                      </div>
                      {booking.payment_schedules?.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Payment Schedule ({booking.payment_schedules.length} installments)</p>
                          <div className="flex gap-2 flex-wrap">
                            {booking.payment_schedules.slice(0, 3).map((schedule, idx) => (
                              <Badge key={idx} variant={schedule.status === 'paid' ? 'success' : 'secondary'}>
                                ₹{formatCurrency(schedule.amount)} - {schedule.due_date}
                              </Badge>
                            ))}
                            {booking.payment_schedules.length > 3 && (
                              <Badge variant="outline">+{booking.payment_schedules.length - 3} more</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {bookings.filter(b => {
                  if (filterStatus === 'all') return true;
                  if (filterStatus === 'active') return b.status !== 'cancelled';
                  return b.status === filterStatus;
                }).length === 0 && (
                  <p className="text-gray-500 text-center py-8">No {filterStatus !== 'all' ? filterStatus : ''} bookings found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-ocean-primary">
                  Payment History ({payments.filter(p => filterStatus === 'all' || (filterStatus === 'pending' && p.status !== 'Success')).length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filterStatus === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('pending')}
                  >
                    Pending
                  </Button>
                  <Button 
                    variant={filterStatus === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('success')}
                  >
                    Success
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Property</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Mode</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .filter(p => {
                        if (filterStatus === 'all') return true;
                        if (filterStatus === 'pending') return p.status !== 'Success';
                        if (filterStatus === 'success') return p.status === 'Success';
                        return true;
                      })
                      .map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="px-4 py-3 text-sm">{payment.payment_date}</td>
                        <td className="px-4 py-3 font-medium">₹{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3 text-sm">{payment.property_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{payment.mode_id || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={payment.status === 'Success' ? 'success' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {payment.status === 'Success' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`${API_URL}/api/pdf/payment-receipt/${payment.id}`, '_blank')}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.filter(p => {
                  if (filterStatus === 'all') return true;
                  if (filterStatus === 'pending') return p.status !== 'Success';
                  if (filterStatus === 'success') return p.status === 'Success';
                  return true;
                }).length === 0 && (
                  <p className="text-gray-500 text-center py-8">No {filterStatus !== 'all' ? filterStatus : ''} payment history</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties Tab - Enhanced "My Properties" View */}
        <TabsContent value="properties">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-ocean-primary">
                  <Building className="w-5 h-5" />
                  My Properties ({properties.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAllData}
                  className="text-ocean-primary border-ocean-primary/30 hover:bg-ocean-primary/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Properties Yet</h3>
                  <p className="text-gray-500">Your booked properties will appear here once you make a booking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => {
                    // Calculate payment progress
                    const totalAmount = property.booking?.total_amount || property.price || 0;
                    const paidAmount = property.booking?.paid_amount || 0;
                    const pendingAmount = totalAmount - paidAmount;
                    const paymentProgress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
                    
                    return (
                      <Card key={property.id} className="border-2 border-ocean-primary/10 hover:border-ocean-primary/30 transition-all hover:shadow-xl">
                        <CardContent className="p-5">
                          {/* Property Header with Image Placeholder */}
                          <div className="mb-4 relative">
                            <div className="bg-gradient-to-br from-ocean-primary/10 to-ocean-secondary/10 h-36 rounded-lg flex items-center justify-center">
                              <Home className="h-16 w-16 text-ocean-primary/40" />
                            </div>
                            {/* Status Badge */}
                            <Badge 
                              className={`absolute top-2 right-2 ${
                                property.payment_status === 'completed' || paymentProgress >= 100
                                  ? 'bg-green-500' 
                                  : paymentProgress > 50 
                                  ? 'bg-blue-500' 
                                  : 'bg-yellow-500'
                              }`}
                            >
                              {property.payment_status === 'completed' || paymentProgress >= 100 ? 'Fully Paid' : `${paymentProgress}% Paid`}
                            </Badge>
                          </div>
                          
                          {/* Property Details */}
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-bold text-xl text-ocean-primary">{property.property_number}</h3>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {property.project?.name || 'N/A'}
                              </p>
                            </div>
                            
                            {/* Property Info Grid */}
                            <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100">
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500">Area</p>
                                <p className="font-semibold text-sm">{property.area || '-'} {property.unit || 'sq.yard'}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500">Facing</p>
                                <p className="font-semibold text-sm">{property.facing || 'N/A'}</p>
                              </div>
                            </div>
                            
                            {/* Financial Summary */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Value:</span>
                                <span className="font-bold text-green-600">₹{(totalAmount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Paid Amount:</span>
                                <span className="font-semibold text-blue-600">₹{(paidAmount || 0).toLocaleString('en-IN')}</span>
                              </div>
                              {pendingAmount > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Pending:</span>
                                  <span className="font-semibold text-orange-600">₹{pendingAmount.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              
                              {/* Payment Progress Bar */}
                              <div className="pt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Payment Progress</span>
                                  <span>{paymentProgress}%</span>
                                </div>
                                <Progress value={paymentProgress} className="h-2" />
                              </div>
                            </div>
                            
                            {/* Booking Date */}
                            {property.booking?.booking_date && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                                <Clock className="w-3 h-3" />
                                Booked on: {formatDate(property.booking.booking_date)}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="mt-4 space-y-2">
                            {/* PDF Download Buttons */}
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs border-ocean-primary/30 text-ocean-primary hover:bg-ocean-primary/10"
                                onClick={() => window.open(`${API_URL}/api/pdf/allotment-letter/${property.id}`, '_blank')}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Allotment Letter
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs border-ocean-secondary/30 text-ocean-secondary hover:bg-ocean-secondary/10"
                                onClick={() => window.open(`${API_URL}/api/pdf/payment-schedule/${property.id}`, '_blank')}
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Schedule PDF
                              </Button>
                            </div>
                            
                            {/* View Payment Schedule Button */}
                            {property.booking_id && (
                              <Button 
                                className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:opacity-90 text-white"
                                size="sm"
                                onClick={() => {
                                  setActiveTab('schedules');
                                  setFilterStatus('all');
                                }}
                              >
                                <IndianRupee className="w-3 h-3 mr-1" />
                                View Payment Schedule
                              </Button>
                            )}
                            
                            {/* Resale Request Button */}
                            {!property.booking_id ? (
                              <Button 
                                className="w-full bg-gray-100 text-gray-500 border-gray-300" 
                                variant="outline"
                                size="sm"
                                disabled
                              >
                                No Booking Record
                              </Button>
                            ) : propertyResaleStatus[property.id]?.hasRequest ? (
                              <Button 
                                className="w-full bg-green-50 text-green-700 border-green-200" 
                                variant="outline"
                                size="sm"
                                disabled
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resale Request: {propertyResaleStatus[property.id]?.status}
                              </Button>
                            ) : (
                              <Button 
                                className="w-full border-orange-300 text-orange-600 hover:bg-orange-50" 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setShowResaleDialog(true);
                                }}
                              >
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Request Resale
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedule Tab */}
        <TabsContent value="schedules">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-ocean-primary">
                  Payment Schedule ({paymentSchedules.filter(s => filterStatus === 'all' || s.status === filterStatus).length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={filterStatus === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('pending')}
                  >
                    Pending
                  </Button>
                  <Button 
                    variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('overdue')}
                  >
                    Overdue
                  </Button>
                  <Button 
                    variant={filterStatus === 'paid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('paid')}
                  >
                    Paid
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentSchedules
                  .filter(s => filterStatus === 'all' || s.status === filterStatus)
                  .map((schedule) => {
                    const isPending = schedule.status === 'pending' || schedule.status === 'overdue';
                    const remainingAmount = schedule.remaining_amount || schedule.amount || 0;
                    
                    return (
                      <div key={schedule.id} className={`flex justify-between items-center p-4 border rounded-lg transition-all ${
                        schedule.status === 'overdue' ? 'border-red-200 bg-red-50' : 
                        schedule.status === 'paid' ? 'border-green-200 bg-green-50' : 
                        'border-gray-200 hover:border-ocean-primary/30'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">₹{(schedule.amount || 0).toLocaleString('en-IN')}</p>
                            {schedule.installment_number !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                EMI #{schedule.installment_number}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{schedule.property_number || 'Property'}</p>
                          {schedule.paid_amount > 0 && schedule.status !== 'paid' && (
                            <p className="text-xs text-green-600">
                              Paid: ₹{schedule.paid_amount.toLocaleString('en-IN')} | 
                              Remaining: ₹{remainingAmount.toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>
                        <div className="text-center mr-4">
                          <p className="text-sm font-medium">{formatDate(schedule.due_date)}</p>
                          <Badge className={`mt-1 ${
                            schedule.status === 'paid' ? 'bg-green-500' : 
                            schedule.status === 'overdue' ? 'bg-red-500' : 
                            'bg-yellow-500'
                          }`}>
                            {schedule.status}
                          </Badge>
                        </div>
                        
                        {/* Pay Now Button */}
                        {isPending && remainingAmount > 0 && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                            onClick={async () => {
                              try {
                                toast.loading('Creating payment session...', { id: 'pay-now' });
                                const response = await fetch(`${API_URL}/api/bookings/pay-now`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(isCustomerPortal ? portalHeaders : {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    })
                                  },
                                  body: JSON.stringify({
                                    schedule_id: schedule.id,
                                    origin_url: window.location.origin,
                                    payment_method: 'stripe'
                                  })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success && data.checkout_url) {
                                  toast.success('Redirecting to payment...', { id: 'pay-now' });
                                  window.location.href = data.checkout_url;
                                } else {
                                  toast.error(data.detail || 'Failed to create payment session', { id: 'pay-now' });
                                }
                              } catch (error) {
                                console.error('Pay Now error:', error);
                                toast.error('Failed to initiate payment. Please try again.', { id: 'pay-now' });
                              }
                            }}
                          >
                            <Banknote className="w-4 h-4 mr-1" />
                            Pay Now
                          </Button>
                        )}
                        
                        {schedule.status === 'paid' && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                {paymentSchedules.filter(s => filterStatus === 'all' || s.status === filterStatus).length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No {filterStatus !== 'all' ? filterStatus : ''} payment schedules found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resale Requests Tab */}
        <TabsContent value="resale">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary">Resale Requests ({resaleRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resaleRequests.map((request) => (
                  <Card key={request.id} className="border">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-semibold">{request.property?.property_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Asking Price</p>
                          <p className="font-semibold">₹{formatCurrency(request.asking_price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge>{request.status}</Badge>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">Reason:</p>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {resaleRequests.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No resale requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resale Request Dialog */}
      <Dialog open={showResaleDialog} onOpenChange={setShowResaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Property Resale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Property</label>
              <Input value={selectedProperty?.property_number || ''} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Asking Price *</label>
              <Input
                type="number"
                value={resaleForm.asking_price}
                onChange={(e) => setResaleForm({ ...resaleForm, asking_price: e.target.value })}
                placeholder="Enter asking price"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                value={resaleForm.reason}
                onChange={(e) => setResaleForm({ ...resaleForm, reason: e.target.value })}
                placeholder="Reason for resale"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <textarea
                value={resaleForm.notes}
                onChange={(e) => setResaleForm({ ...resaleForm, notes: e.target.value })}
                placeholder="Any additional information"
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <Button 
              onClick={handleResaleRequest} 
              className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-light hover:to-ocean-secondary-light text-white"
            >
              Submit Resale Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={showBookingDetail} onOpenChange={setShowBookingDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-ocean-primary">
              Booking Details
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              {/* Property & Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-ocean-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-ocean-primary">Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property Number:</span>
                      <span className="font-semibold">{selectedBooking.property?.property_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project:</span>
                      <span className="font-semibold">{selectedBooking.project?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold">{selectedBooking.property?.property_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Area:</span>
                      <span className="font-semibold">{selectedBooking.property?.area || 'N/A'} sq.ft</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-ocean-secondary/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-ocean-secondary">Booking Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="font-semibold">{selectedBooking.id?.slice(0, 8) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking Date:</span>
                      <span className="font-semibold">{selectedBooking.booking_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className="capitalize">{selectedBooking.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Information */}
              <Card className="border-2 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-lg text-green-600">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">₹{formatCurrency(selectedBooking.total_amount)}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Amount Paid</p>
                      <p className="text-2xl font-bold text-green-600">₹{formatCurrency(selectedBooking.paid_amount)}</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">Balance Due</p>
                      <p className="text-2xl font-bold text-yellow-600">₹{formatCurrency(selectedBooking.total_amount - selectedBooking.paid_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Schedule */}
              {selectedBooking.payment_schedules && selectedBooking.payment_schedules.length > 0 && (
                <Card className="border-2 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-600">
                      Payment Schedule ({selectedBooking.payment_schedules.length} Installments)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedBooking.payment_schedules.map((schedule, idx) => (
                        <div 
                          key={idx} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            schedule.status === 'paid' 
                              ? 'bg-green-50 border border-green-200' 
                              : schedule.status === 'overdue' 
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">Installment #{idx + 1}</p>
                            <p className="text-sm text-gray-600">Due: {schedule.due_date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₹{formatCurrency(schedule.amount)}</p>
                            <Badge variant={schedule.status === 'paid' ? 'success' : schedule.status === 'overdue' ? 'destructive' : 'secondary'}>
                              {schedule.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBookingDetail(false)}
                >
                  Close
                </Button>
                <Button 
                  className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                  onClick={() => {
                    setShowBookingDetail(false);
                    setActiveTab('schedules');
                  }}
                >
                  View Payment Schedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default CustomerDashboard;
