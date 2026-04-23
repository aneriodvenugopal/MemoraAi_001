/**
 * EMI Payment Management
 * - View/manage EMI schedules
 * - Track overdue payments with late fees
 * - Record payments
 * - Statistics and reports
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, DollarSign, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Plus, Eye, CreditCard, TrendingUp, Users, Building,
  ArrowLeft, Bell, Percent, Receipt, Download, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
  waived: 'bg-gray-100 text-gray-800'
};

const EMIPaymentManagement = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [overdueEmis, setOverdueEmis] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [projects, setProjects] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showWaiveDialog, setShowWaiveDialog] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  
  // Form state
  const [createForm, setCreateForm] = useState({
    booking_id: '',
    total_amount: 0,
    down_payment: 0,
    emi_months: 12,
    late_fee_percentage: 2.0
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'bank_transfer',
    transaction_id: '',
    reference_number: '',
    notes: '',
    include_late_fee: true
  });
  
  const [waiveForm, setWaiveForm] = useState({
    reason: '',
    partial_waive_amount: null
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch data
  const fetchStats = useCallback(async () => {
    try {
      let url = `${API_URL}/api/emi-payments/stats`;
      if (selectedProject && selectedProject !== 'all') {
        url += `?project_id=${selectedProject}`;
      }
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [token, selectedProject]);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/emi-payments/schedules?limit=200`;
      if (selectedProject && selectedProject !== 'all') {
        url += `&project_id=${selectedProject}`;
      }
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedProject, statusFilter]);

  const fetchOverdue = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/overdue?limit=50`, { headers });
      const data = await res.json();
      if (data.success) {
        setOverdueEmis(data.overdue_emis || []);
      }
    } catch (err) {
      console.error('Error fetching overdue:', err);
    }
  }, [token]);

  const fetchDueSoon = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/due-soon?days=7`, { headers });
      const data = await res.json();
      if (data.success) {
        setDueSoon(data.due_soon || []);
      }
    } catch (err) {
      console.error('Error fetching due soon:', err);
    }
  }, [token]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, [token]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/?limit=200`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
    fetchBookings();
  }, [fetchProjects, fetchBookings]);

  useEffect(() => {
    fetchStats();
    fetchSchedules();
    fetchOverdue();
    fetchDueSoon();
  }, [fetchStats, fetchSchedules, fetchOverdue, fetchDueSoon]);

  // Create EMI Schedule
  const handleCreateSchedule = async () => {
    if (!createForm.booking_id) {
      toast.error('Please select a booking');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/schedules/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Created ${data.schedules.length} EMI schedules`);
        setShowCreateDialog(false);
        setCreateForm({
          booking_id: '',
          total_amount: 0,
          down_payment: 0,
          emi_months: 12,
          late_fee_percentage: 2.0
        });
        fetchStats();
        fetchSchedules();
      } else {
        toast.error(data.detail || 'Failed to create schedule');
      }
    } catch (err) {
      toast.error('Error creating schedule');
    } finally {
      setLoading(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async () => {
    if (!selectedEmi || paymentForm.amount <= 0) {
      toast.error('Please enter valid amount');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/payments/record`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emi_id: selectedEmi.id,
          ...paymentForm
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Payment recorded. Receipt: ${data.receipt_number}`);
        setShowPaymentDialog(false);
        setSelectedEmi(null);
        setPaymentForm({
          amount: 0,
          payment_method: 'bank_transfer',
          transaction_id: '',
          reference_number: '',
          notes: '',
          include_late_fee: true
        });
        fetchStats();
        fetchSchedules();
        fetchOverdue();
      } else {
        toast.error(data.detail || 'Failed to record payment');
      }
    } catch (err) {
      toast.error('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  // Waive Late Fee
  const handleWaiveLateFee = async () => {
    if (!selectedEmi || !waiveForm.reason) {
      toast.error('Please provide reason for waiver');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/late-fees/waive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emi_id: selectedEmi.id,
          reason: waiveForm.reason,
          partial_waive_amount: waiveForm.partial_waive_amount || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowWaiveDialog(false);
        setSelectedEmi(null);
        setWaiveForm({ reason: '', partial_waive_amount: null });
        fetchStats();
        fetchSchedules();
        fetchOverdue();
      } else {
        toast.error(data.detail || 'Failed to waive late fee');
      }
    } catch (err) {
      toast.error('Error waiving late fee');
    } finally {
      setLoading(false);
    }
  };

  // View Booking Details
  const handleViewBookingDetails = async (bookingId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/schedules/booking/${bookingId}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setSelectedBookingDetail(data);
        setShowDetailDialog(true);
      } else {
        toast.error('Failed to load booking details');
      }
    } catch (err) {
      toast.error('Error loading details');
    } finally {
      setLoading(false);
    }
  };

  // Download Receipt
  const handleDownloadReceipt = async (paymentId) => {
    try {
      window.open(`${API_URL}/api/receipts/payment/${paymentId}?download=true`, '_blank');
      toast.success('Receipt download started');
    } catch (err) {
      toast.error('Error downloading receipt');
    }
  };

  // Download EMI Schedule PDF
  const handleDownloadSchedule = async (bookingId) => {
    try {
      window.open(`${API_URL}/api/receipts/emi-schedule/${bookingId}?download=true`, '_blank');
      toast.success('Schedule download started');
    } catch (err) {
      toast.error('Error downloading schedule');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="emi-payment-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-7 h-7 text-indigo-600" />
                EMI Payment Management
              </h1>
              <p className="text-gray-500 mt-1">
                Track EMI schedules, payments, and overdue accounts
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchStats();
                fetchSchedules();
                fetchOverdue();
                fetchDueSoon();
              }}
              disabled={loading}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="create-schedule-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create EMI Schedule
            </Button>
          </div>
        </div>

        {/* Stats Cards - Clickable */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <ClickableStatCard 
              title="Total EMIs" 
              value={stats.total_emis} 
              icon={CreditCard} 
              color="blue"
              onClick={() => setActiveTab('schedules')}
              className={activeTab === 'schedules' ? 'ring-2 ring-blue-500' : ''}
            />
            <ClickableStatCard 
              title="Collected" 
              value={formatCurrency(stats.total_paid)} 
              icon={TrendingUp} 
              color="green"
              subtitle={`${stats.collection_rate}% rate`}
            />
            <ClickableStatCard 
              title="Pending" 
              value={formatCurrency(stats.total_pending)} 
              icon={Clock} 
              color="yellow"
              onClick={() => setActiveTab('due-soon')}
              className={activeTab === 'due-soon' ? 'ring-2 ring-yellow-500' : ''}
            />
            <ClickableStatCard 
              title="Overdue" 
              value={stats.overdue_count} 
              icon={AlertTriangle} 
              color="red"
              subtitle={formatCurrency(stats.overdue_amount)}
              onClick={() => setActiveTab('overdue')}
              className={activeTab === 'overdue' ? 'ring-2 ring-red-500' : ''}
            />
            <ClickableStatCard 
              title="Late Fees" 
              value={formatCurrency(stats.total_late_fees)} 
              icon={Percent} 
              color="orange"
            />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-64">
                <Label className="text-sm">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger data-testid="project-filter">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedules" data-testid="schedules-tab">
              <Calendar className="w-4 h-4 mr-2" />
              All EMIs ({schedules.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" data-testid="overdue-tab">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Overdue ({overdueEmis.length})
            </TabsTrigger>
            <TabsTrigger value="due-soon" data-testid="due-soon-tab">
              <Bell className="w-4 h-4 mr-2" />
              Due Soon ({dueSoon.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Overdue */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Recent Overdue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overdueEmis.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No overdue EMIs</p>
                  ) : (
                    <div className="space-y-3">
                      {overdueEmis.slice(0, 5).map((emi) => (
                        <div key={emi.id} className="p-3 border rounded-lg bg-red-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{emi.customer_name || 'Customer'}</p>
                              <p className="text-sm text-gray-600">EMI #{emi.installment_number}</p>
                              <p className="text-xs text-red-600">{emi.days_overdue} days overdue</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">{formatCurrency(emi.total_due)}</p>
                              {emi.late_fee_amount > 0 && (
                                <p className="text-xs text-orange-600">
                                  +{formatCurrency(emi.late_fee_amount)} late fee
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Due This Week */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    Due This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dueSoon.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No EMIs due this week</p>
                  ) : (
                    <div className="space-y-3">
                      {dueSoon.slice(0, 5).map((emi) => (
                        <div key={emi.id} className="p-3 border rounded-lg bg-yellow-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{emi.customer_name || 'Customer'}</p>
                              <p className="text-sm text-gray-600">EMI #{emi.installment_number}</p>
                              <p className="text-xs text-yellow-600">
                                Due in {emi.days_until_due} days
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(emi.due_amount)}</p>
                              <p className="text-xs text-gray-500">{formatDate(emi.due_date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Schedules Tab */}
          <TabsContent value="schedules" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>EMI Schedules</CardTitle>
                <CardDescription>All EMI installments</CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No EMI schedules found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((emi) => (
                      <div
                        key={emi.id}
                        className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                          emi.is_overdue ? 'border-red-200 bg-red-50' : ''
                        }`}
                        data-testid={`emi-item-${emi.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                EMI #{emi.installment_number}
                              </span>
                              <Badge className={STATUS_COLORS[emi.status]}>
                                {emi.status}
                              </Badge>
                              {emi.is_overdue && (
                                <Badge variant="destructive">
                                  {emi.days_overdue}d overdue
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Due: {formatDate(emi.due_date)}
                            </p>
                            <div className="flex gap-4 text-sm">
                              <span>Amount: {formatCurrency(emi.due_amount)}</span>
                              <span className="text-green-600">
                                Paid: {formatCurrency(emi.paid_amount)}
                              </span>
                              {emi.late_fee_amount > 0 && (
                                <span className="text-orange-600">
                                  Late Fee: {formatCurrency(emi.late_fee_amount)}
                                </span>
                              )}
                            </div>
                            {emi.remaining_amount > 0 && (
                              <p className="text-sm font-medium text-red-600">
                                Total Due: {formatCurrency(emi.total_due)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {emi.status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedEmi(emi);
                                  setPaymentForm({
                                    ...paymentForm,
                                    amount: emi.total_due || emi.remaining_amount || emi.due_amount
                                  });
                                  setShowPaymentDialog(true);
                                }}
                                data-testid={`pay-btn-${emi.id}`}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                            )}
                            {emi.late_fee_amount > 0 && emi.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEmi(emi);
                                  setShowWaiveDialog(true);
                                }}
                                data-testid={`waive-btn-${emi.id}`}
                              >
                                Waive Fee
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewBookingDetails(emi.booking_id)}
                              data-testid={`view-btn-${emi.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue EMIs
                </CardTitle>
                <CardDescription>
                  EMIs past their due date with applicable late fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overdueEmis.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>No overdue EMIs! Great job on collections.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueEmis.map((emi) => (
                      <div
                        key={emi.id}
                        className="p-4 border border-red-200 rounded-lg bg-red-50"
                        data-testid={`overdue-item-${emi.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {emi.customer_name || 'Unknown'}
                              </span>
                              <span className="text-gray-500">•</span>
                              <span>EMI #{emi.installment_number}</span>
                            </div>
                            <p className="text-sm text-gray-600">{emi.customer_phone}</p>
                            <div className="flex gap-4 text-sm">
                              <span className="text-red-600 font-medium">
                                {emi.days_overdue} days overdue
                              </span>
                              <span>Due: {formatDate(emi.due_date)}</span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span>Principal: {formatCurrency(emi.remaining_amount)}</span>
                              <span className="text-orange-600">
                                Late Fee: {formatCurrency(emi.late_fee_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="text-xl font-bold text-red-600">
                              {formatCurrency(emi.total_due)}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedEmi(emi);
                                  setPaymentForm({
                                    ...paymentForm,
                                    amount: emi.total_due
                                  });
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Collect
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Due Soon Tab */}
          <TabsContent value="due-soon" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  EMIs Due Within 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dueSoon.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No EMIs due in the next 7 days</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dueSoon.map((emi) => (
                      <div
                        key={emi.id}
                        className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
                        data-testid={`due-soon-item-${emi.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {emi.customer_name || 'Unknown'}
                              </span>
                              <Badge variant="outline">
                                EMI #{emi.installment_number}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{emi.customer_phone}</p>
                            <p className="text-sm">
                              <span className="text-yellow-600 font-medium">
                                Due in {emi.days_until_due} days
                              </span>
                              <span className="text-gray-500 ml-2">
                                ({formatDate(emi.due_date)})
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{formatCurrency(emi.due_amount)}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => {
                                setSelectedEmi(emi);
                                setPaymentForm({
                                  ...paymentForm,
                                  amount: emi.due_amount
                                });
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Pay Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Schedule Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create EMI Schedule</DialogTitle>
              <DialogDescription>
                Set up EMI payment schedule for a booking
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Booking *</Label>
                <Select
                  value={createForm.booking_id}
                  onValueChange={(v) => {
                    const booking = bookings.find(b => b.id === v);
                    setCreateForm({
                      ...createForm,
                      booking_id: v,
                      total_amount: booking?.total_amount || 0
                    });
                  }}
                >
                  <SelectTrigger data-testid="booking-select">
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.customer_name || b.id.slice(0, 8)} - {formatCurrency(b.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Amount *</Label>
                  <Input
                    type="number"
                    value={createForm.total_amount}
                    onChange={(e) => setCreateForm({ ...createForm, total_amount: parseFloat(e.target.value) || 0 })}
                    data-testid="total-amount-input"
                  />
                </div>
                <div>
                  <Label>Down Payment</Label>
                  <Input
                    type="number"
                    value={createForm.down_payment}
                    onChange={(e) => setCreateForm({ ...createForm, down_payment: parseFloat(e.target.value) || 0 })}
                    data-testid="down-payment-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>EMI Months *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={createForm.emi_months}
                    onChange={(e) => setCreateForm({ ...createForm, emi_months: parseInt(e.target.value) || 12 })}
                    data-testid="emi-months-input"
                  />
                </div>
                <div>
                  <Label>Late Fee % (per month)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={createForm.late_fee_percentage}
                    onChange={(e) => setCreateForm({ ...createForm, late_fee_percentage: parseFloat(e.target.value) || 2 })}
                    data-testid="late-fee-input"
                  />
                </div>
              </div>
              {createForm.total_amount > 0 && createForm.emi_months > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly EMI (approx):</p>
                  <p className="text-xl font-bold">
                    {formatCurrency((createForm.total_amount - createForm.down_payment) / createForm.emi_months)}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSchedule} disabled={loading} data-testid="create-btn">
                {loading ? 'Creating...' : 'Create Schedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record EMI Payment</DialogTitle>
              <DialogDescription>
                {selectedEmi && `EMI #${selectedEmi.installment_number} - Due: ${formatCurrency(selectedEmi.total_due || selectedEmi.due_amount)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedEmi && selectedEmi.late_fee_amount > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Late fee of {formatCurrency(selectedEmi.late_fee_amount)} applies
                  </p>
                </div>
              )}
              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  data-testid="payment-amount-input"
                />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                >
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction ID</Label>
                <Input
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                  placeholder="Transaction reference"
                  data-testid="transaction-id-input"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={loading} data-testid="record-payment-btn">
                {loading ? 'Processing...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Waive Late Fee Dialog */}
        <Dialog open={showWaiveDialog} onOpenChange={setShowWaiveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Waive Late Fee</DialogTitle>
              <DialogDescription>
                {selectedEmi && `Current late fee: ${formatCurrency(selectedEmi.late_fee_amount)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Reason for Waiver *</Label>
                <Textarea
                  value={waiveForm.reason}
                  onChange={(e) => setWaiveForm({ ...waiveForm, reason: e.target.value })}
                  placeholder="Enter reason for waiving late fee"
                  rows={3}
                  data-testid="waive-reason-input"
                />
              </div>
              <div>
                <Label>Partial Waive Amount (optional)</Label>
                <Input
                  type="number"
                  value={waiveForm.partial_waive_amount || ''}
                  onChange={(e) => setWaiveForm({ ...waiveForm, partial_waive_amount: parseFloat(e.target.value) || null })}
                  placeholder="Leave empty to waive full amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWaiveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleWaiveLateFee} disabled={loading} data-testid="waive-btn">
                {loading ? 'Processing...' : 'Waive Late Fee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Booking Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>EMI Schedule Details</DialogTitle>
            </DialogHeader>
            {selectedBookingDetail && (
              <div className="space-y-4 py-4">
                {/* Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{selectedBookingDetail.summary.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Property</p>
                      <p className="font-medium">{selectedBookingDetail.summary.property_name}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Payment Progress</p>
                    <Progress value={selectedBookingDetail.summary.payment_progress} className="h-3" />
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-green-600">
                        Paid: {formatCurrency(selectedBookingDetail.summary.total_paid)}
                      </span>
                      <span className="text-gray-500">
                        {selectedBookingDetail.summary.payment_progress}%
                      </span>
                      <span className="text-red-600">
                        Pending: {formatCurrency(selectedBookingDetail.summary.total_pending)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedBookingDetail.summary.total_installments}</p>
                      <p className="text-xs text-gray-500">Total EMIs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedBookingDetail.summary.paid_installments}</p>
                      <p className="text-xs text-gray-500">Paid</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{selectedBookingDetail.summary.pending_installments}</p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{selectedBookingDetail.summary.overdue_installments}</p>
                      <p className="text-xs text-gray-500">Overdue</p>
                    </div>
                  </div>
                </div>

                {/* Schedule List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedBookingDetail.schedules.map((emi) => (
                    <div
                      key={emi.id}
                      className={`p-3 border rounded-lg flex justify-between items-center ${
                        emi.status === 'paid' ? 'bg-green-50' : emi.is_overdue ? 'bg-red-50' : ''
                      }`}
                    >
                      <div>
                        <span className="font-medium">EMI #{emi.installment_number}</span>
                        <span className="text-gray-500 ml-2">{formatDate(emi.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{formatCurrency(emi.due_amount)}</span>
                        <Badge className={STATUS_COLORS[emi.status]}>{emi.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDownloadSchedule(selectedBookingDetail.summary.booking_id)}
                data-testid="download-schedule-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Schedule PDF
              </Button>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EMIPaymentManagement;
