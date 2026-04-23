/**
 * Payments Dashboard
 * Comprehensive view of all payment-related data:
 * - Overview stats
 * - Overdue EMIs
 * - Upcoming payments
 * - Collection targets
 * - Project-wise breakdown
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, Calendar,
  CheckCircle, RefreshCw, ArrowLeft, Building, Users, CreditCard,
  PieChart, BarChart3, Target, Bell, Phone, Mail, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentsDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState(null);
  const [overdueEmis, setOverdueEmis] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchOverdue(),
        fetchDueSoon(),
        fetchProjects()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStats = async () => {
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
  };

  const fetchOverdue = async () => {
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/overdue?limit=100`, { headers });
      const data = await res.json();
      if (data.success) {
        setOverdueEmis(data.overdue_emis || []);
      }
    } catch (err) {
      console.error('Error fetching overdue:', err);
    }
  };

  const fetchDueSoon = async () => {
    try {
      const res = await fetch(`${API_URL}/api/emi-payments/due-soon?days=14`, { headers });
      const data = await res.json();
      if (data.success) {
        setDueSoon(data.due_soon || []);
      }
    } catch (err) {
      console.error('Error fetching due soon:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        // Fetch stats for each project
        const statsPromises = data.slice(0, 5).map(async (project) => {
          const statsRes = await fetch(`${API_URL}/api/emi-payments/stats?project_id=${project.id}`, { headers });
          const statsData = await statsRes.json();
          return {
            ...project,
            stats: statsData.stats || {}
          };
        });
        const projectsWithStats = await Promise.all(statsPromises);
        setProjectStats(projectsWithStats.filter(p => p.stats.total_emis > 0));
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchStats();
    }
  }, [selectedProject]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calculate collection target (assuming monthly target based on total pending)
  const collectionTarget = stats ? Math.round(stats.total_pending / 3) : 0;
  const thisMonthCollection = stats ? Math.round(stats.total_paid * 0.15) : 0; // Mock: 15% of total as this month
  const targetProgress = collectionTarget > 0 ? Math.min((thisMonthCollection / collectionTarget) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="payments-dashboard-page">
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
                <DollarSign className="w-7 h-7 text-green-600" />
                Payments Dashboard
              </h1>
              <p className="text-gray-500 mt-1">
                Track collections, overdue payments, and targets
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/emi-payments')} data-testid="manage-emi-btn">
              <CreditCard className="w-4 h-4 mr-2" />
              Manage EMIs
            </Button>
          </div>
        </div>

        {/* Main Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ClickableStatCard 
              title="Total Collection" 
              value={formatCurrency(stats.total_paid)} 
              icon={TrendingUp} 
              color="green"
              subtitle={`${stats.collection_rate}% collection rate`}
              data-testid="stat-total-collection"
            />
            <ClickableStatCard 
              title="Pending Amount" 
              value={formatCurrency(stats.total_pending)} 
              icon={Clock} 
              color="yellow"
              subtitle={`${stats.total_emis - (stats.by_status?.paid || 0)} EMIs pending`}
              onClick={() => setActiveTab('due-soon')}
              data-testid="stat-pending"
            />
            <ClickableStatCard 
              title="Overdue Amount" 
              value={formatCurrency(stats.overdue_amount)} 
              icon={AlertTriangle} 
              color="red"
              subtitle={`${stats.overdue_count} EMIs overdue`}
              onClick={() => setActiveTab('overdue')}
              data-testid="stat-overdue"
            />
            <ClickableStatCard 
              title="Late Fees Accrued" 
              value={formatCurrency(stats.total_late_fees)} 
              icon={DollarSign} 
              color="orange"
              subtitle="Recoverable amount"
              data-testid="stat-late-fees"
            />
          </div>
        )}

        {/* Collection Target Card */}
        {stats && (
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500 shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Collection Target</h3>
                    <p className="text-sm text-gray-500">This Month's Goal</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(thisMonthCollection)}</p>
                  <p className="text-sm text-gray-500">of {formatCurrency(collectionTarget)}</p>
                </div>
              </div>
              <Progress value={targetProgress} className="h-3 bg-green-100" />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-gray-600">{targetProgress.toFixed(0)}% achieved</span>
                <span className="text-gray-600">{formatCurrency(collectionTarget - thisMonthCollection)} remaining</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-64">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Filter by Project</label>
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
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <PieChart className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="overdue" data-testid="overdue-tab">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Overdue ({overdueEmis.length})
            </TabsTrigger>
            <TabsTrigger value="due-soon" data-testid="due-soon-tab">
              <Bell className="w-4 h-4 mr-2" />
              Due Soon ({dueSoon.length})
            </TabsTrigger>
            <TabsTrigger value="projects" data-testid="projects-tab">
              <Building className="w-4 h-4 mr-2" />
              By Project
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    EMI Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-4">
                      {Object.entries(stats.by_status || {}).map(([status, count]) => {
                        const total = stats.total_emis || 1;
                        const percentage = Math.round((count / total) * 100);
                        const colors = {
                          paid: { bg: 'bg-green-100', bar: 'bg-green-500', text: 'text-green-700' },
                          pending: { bg: 'bg-yellow-100', bar: 'bg-yellow-500', text: 'text-yellow-700' },
                          partial: { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
                          overdue: { bg: 'bg-red-100', bar: 'bg-red-500', text: 'text-red-700' },
                          waived: { bg: 'bg-gray-100', bar: 'bg-gray-500', text: 'text-gray-700' }
                        };
                        const color = colors[status] || colors.pending;
                        
                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className={`font-medium capitalize ${color.text}`}>{status}</span>
                              <span className="text-gray-600">{count} ({percentage}%)</span>
                            </div>
                            <div className={`h-3 rounded-full ${color.bg}`}>
                              <div 
                                className={`h-full rounded-full ${color.bar} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    onClick={() => setActiveTab('overdue')}
                  >
                    <AlertTriangle className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Collect Overdue</p>
                      <p className="text-xs opacity-80">{overdueEmis.length} customers with overdue EMIs</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                  
                  <Button 
                    className="w-full justify-start bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                    onClick={() => setActiveTab('due-soon')}
                  >
                    <Bell className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Send Reminders</p>
                      <p className="text-xs opacity-80">{dueSoon.length} EMIs due within 2 weeks</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                  
                  <Button 
                    className="w-full justify-start bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    onClick={() => navigate('/emi-payments')}
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Record Payments</p>
                      <p className="text-xs opacity-80">Record new EMI payments</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                  
                  <Button 
                    className="w-full justify-start bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    onClick={() => navigate('/reports')}
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">View Reports</p>
                      <p className="text-xs opacity-80">Detailed analytics & reports</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                </CardContent>
              </Card>

              {/* Due This Week */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <Clock className="w-5 h-5" />
                    Due This Week
                  </CardTitle>
                  <CardDescription>
                    {stats?.due_this_week_count || 0} EMIs totaling {formatCurrency(stats?.due_this_week_amount || 0)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dueSoon.filter(e => e.days_until_due <= 7).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>No EMIs due this week!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {dueSoon.filter(e => e.days_until_due <= 7).slice(0, 5).map((emi) => (
                        <div key={emi.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{emi.customer_name || 'Customer'}</p>
                              <p className="text-sm text-gray-600">EMI #{emi.installment_number}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                  {emi.days_until_due === 0 ? 'Due Today' : `${emi.days_until_due}d left`}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{formatCurrency(emi.due_amount)}</p>
                              <p className="text-xs text-gray-500">{formatDate(emi.due_date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Overdue */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Critical Overdue
                  </CardTitle>
                  <CardDescription>
                    Top priority collections needed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overdueEmis.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>No overdue EMIs! Great job!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {overdueEmis.slice(0, 5).map((emi) => (
                        <div key={emi.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{emi.customer_name || 'Customer'}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                {emi.customer_phone && (
                                  <a href={`tel:${emi.customer_phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                    <Phone className="w-3 h-3" />
                                    {emi.customer_phone}
                                  </a>
                                )}
                              </div>
                              <Badge variant="destructive" className="mt-1">
                                {emi.days_overdue} days overdue
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">{formatCurrency(emi.total_due)}</p>
                              {emi.late_fee_amount > 0 && (
                                <p className="text-xs text-orange-600">
                                  +{formatCurrency(emi.late_fee_amount)} fee
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
            </div>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  All Overdue EMIs
                </CardTitle>
                <CardDescription>
                  {overdueEmis.length} customers with overdue payments totaling {formatCurrency(stats?.overdue_amount || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overdueEmis.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                    <p className="text-lg font-medium">No Overdue EMIs!</p>
                    <p className="text-sm">All payments are on track.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueEmis.map((emi) => (
                      <div
                        key={emi.id}
                        className="p-4 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                        data-testid={`overdue-item-${emi.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {emi.customer_name || 'Unknown Customer'}
                              </span>
                              <Badge variant="destructive">
                                {emi.days_overdue} days overdue
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {emi.customer_phone && (
                                <a href={`tel:${emi.customer_phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <Phone className="w-3 h-3" />
                                  {emi.customer_phone}
                                </a>
                              )}
                              <span>EMI #{emi.installment_number}</span>
                              <span>Due: {formatDate(emi.due_date)}</span>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span>Principal: {formatCurrency(emi.remaining_amount)}</span>
                              <span className="text-orange-600">Late Fee: {formatCurrency(emi.late_fee_amount)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(emi.total_due)}</p>
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => navigate('/emi-payments')}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Collect
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

          {/* Due Soon Tab */}
          <TabsContent value="due-soon" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Bell className="w-5 h-5" />
                  EMIs Due Within 14 Days
                </CardTitle>
                <CardDescription>
                  {dueSoon.length} upcoming payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dueSoon.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium">No EMIs Due Soon</p>
                    <p className="text-sm">No payments due in the next 2 weeks.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dueSoon.map((emi) => (
                      <div
                        key={emi.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          emi.days_until_due <= 3 
                            ? 'border-orange-300 bg-orange-50 hover:bg-orange-100' 
                            : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        }`}
                        data-testid={`due-soon-item-${emi.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {emi.customer_name || 'Unknown Customer'}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={emi.days_until_due <= 3 ? 'border-orange-400 text-orange-700' : 'border-yellow-400 text-yellow-700'}
                              >
                                {emi.days_until_due === 0 ? 'Due Today' : `${emi.days_until_due} days left`}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {emi.customer_phone && (
                                <a href={`tel:${emi.customer_phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                  <Phone className="w-3 h-3" />
                                  {emi.customer_phone}
                                </a>
                              )}
                              <span>EMI #{emi.installment_number}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(emi.due_amount)}</p>
                            <p className="text-sm text-gray-500">{formatDate(emi.due_date)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-500" />
                  Project-wise Collection
                </CardTitle>
                <CardDescription>
                  Payment statistics by project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Building className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium">No Project Data</p>
                    <p className="text-sm">No EMI schedules found for any project.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectStats.map((project) => {
                      const projectStat = project.stats;
                      return (
                        <div
                          key={project.id}
                          className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedProject(project.id)}
                          data-testid={`project-item-${project.id}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{project.name}</h4>
                              <p className="text-sm text-gray-500">{projectStat.total_emis} EMIs</p>
                            </div>
                            <Badge 
                              className={projectStat.overdue_count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                            >
                              {projectStat.collection_rate}% collected
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Collected</p>
                              <p className="font-semibold text-green-600">{formatCurrency(projectStat.total_paid)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Pending</p>
                              <p className="font-semibold text-yellow-600">{formatCurrency(projectStat.total_pending)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Overdue</p>
                              <p className="font-semibold text-red-600">{formatCurrency(projectStat.overdue_amount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Late Fees</p>
                              <p className="font-semibold text-orange-600">{formatCurrency(projectStat.total_late_fees)}</p>
                            </div>
                          </div>
                          
                          <Progress 
                            value={projectStat.collection_rate} 
                            className="h-2 mt-3" 
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PaymentsDashboard;
