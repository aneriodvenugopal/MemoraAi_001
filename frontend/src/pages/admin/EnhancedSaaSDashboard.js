import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Package, DollarSign, TrendingUp, Calendar, Activity,
  Building2, Home, FileText, UserCheck, ArrowUp, ArrowDown,
  Percent, Target, Clock, Award, MapPin
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function EnhancedSaaSDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [tenantStats, setTenantStats] = useState([]);
  const [workforceCount, setWorkforceCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    fetchEnhancedMetrics();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiInstance.get('/saas-admin/dashboard');
      
      if (response.data.success) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard');
      
      if (err.response?.status === 403) {
        alert('Access denied. SaaS Admin only.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkforceCount = async () => {
    try {
      const response = await apiInstance.get('/workforce/stats');
      setWorkforceCount(response.data.total_approved_workers || 0);
    } catch (error) {
      console.error('Error fetching workforce count:', error);
      setWorkforceCount(0);
    }
  };

  const fetchEnhancedMetrics = async () => {
    try {
      fetchWorkforceCount(); // Fetch workforce count in parallel
      // Fetch all tenants with their stats
      const tenantsResponse = await apiInstance.get('/saas-admin/tenants');
      if (tenantsResponse.data.success) {
        const tenants = tenantsResponse.data.tenants;
        
        // For each tenant, calculate aggregated stats
        const statsPromises = tenants.map(async (tenant) => {
          try {
            const hierarchyResponse = await apiInstance.get(`/saas-admin/tenants/${tenant.id}/hierarchy`);
            if (hierarchyResponse.data.success) {
              const hierarchy = hierarchyResponse.data.hierarchy;
              return {
                tenant_name: tenant.company_name,
                tenant_id: tenant.id,
                projects: hierarchy.projects?.length || 0,
                properties: hierarchy.projects?.reduce((sum, p) => sum + (p.property_count || 0), 0) || 0,
                staff: hierarchy.staff?.length || 0,
                status: tenant.status
              };
            }
          } catch (err) {
            console.error(`Failed to fetch stats for tenant ${tenant.id}`, err);
          }
          return null;
        });

        const stats = await Promise.all(statsPromises);
        setTenantStats(stats.filter(s => s !== null));
      }
    } catch (err) {
      console.error('Failed to fetch enhanced metrics:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Loading SaaS Analytics Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { overview, timeline, package_distribution, recent_tenants } = dashboardData;

  // Calculate aggregate metrics from tenant stats
  const totalProjects = tenantStats.reduce((sum, t) => sum + t.projects, 0);
  const totalProperties = tenantStats.reduce((sum, t) => sum + t.properties, 0);
  const totalStaff = tenantStats.reduce((sum, t) => sum + t.staff, 0);
  const activeTenants = tenantStats.filter(t => t.status === 'active').length;

  // Prepare data for charts
  const timelineData = [
    { name: 'Previous Subscriptions', value: timeline.previous, color: '#ef4444' },
    { name: 'Active Now', value: timeline.present, color: '#10b981' },
    { name: 'Future Subscriptions', value: timeline.future, color: '#3b82f6' }
  ];

  // Monthly revenue trend (mock data - can be replaced with real data)
  const revenueTrend = [
    { month: 'Jan', revenue: overview.monthly_recurring_revenue * 0.6, tenants: Math.floor(overview.total_tenants * 0.6) },
    { month: 'Feb', revenue: overview.monthly_recurring_revenue * 0.7, tenants: Math.floor(overview.total_tenants * 0.7) },
    { month: 'Mar', revenue: overview.monthly_recurring_revenue * 0.75, tenants: Math.floor(overview.total_tenants * 0.75) },
    { month: 'Apr', revenue: overview.monthly_recurring_revenue * 0.8, tenants: Math.floor(overview.total_tenants * 0.8) },
    { month: 'May', revenue: overview.monthly_recurring_revenue * 0.9, tenants: Math.floor(overview.total_tenants * 0.9) },
    { month: 'Jun', revenue: overview.monthly_recurring_revenue, tenants: overview.total_tenants }
  ];

  // Top performing tenants by properties
  const topTenants = [...tenantStats]
    .sort((a, b) => b.properties - a.properties)
    .slice(0, 5)
    .map(t => ({
      name: t.tenant_name.length > 20 ? t.tenant_name.substring(0, 20) + '...' : t.tenant_name,
      properties: t.properties,
      projects: t.projects
    }));

  // Growth metrics
  const growthRate = overview.total_tenants > 0 ? ((overview.active_tenants / overview.total_tenants) * 100).toFixed(1) : 0;
  const avgPropertiesPerTenant = overview.total_tenants > 0 ? (totalProperties / overview.total_tenants).toFixed(1) : 0;
  const avgProjectsPerTenant = overview.total_tenants > 0 ? (totalProjects / overview.total_tenants).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                SaaS Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Real Estate ERP Platform Insights</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/admin/packages')}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <Package size={18} />
                Packages
              </button>
              <button
                onClick={() => navigate('/admin/tenants')}
                className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <Users size={18} />
                Tenants
              </button>
              <button
                onClick={() => navigate('/admin/workforce')}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <UserCheck size={18} />
                Workforce
              </button>
              <button
                onClick={() => navigate('/admin/master-categories')}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-orange-700 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <Building2 size={18} />
                Categories
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Primary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Users size={28} />
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                <ArrowUp size={16} />
                <span>{growthRate}%</span>
              </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Total Tenants</p>
            <p className="text-4xl font-bold">{overview.total_tenants}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-blue-100">
                <span className="font-semibold text-white">{overview.active_tenants}</span> Active
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <DollarSign size={28} />
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                <TrendingUp size={16} />
                <span>MRR</span>
              </div>
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Monthly Revenue</p>
            <p className="text-4xl font-bold">₹{(overview.monthly_recurring_revenue / 1000).toFixed(0)}K</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-green-100">
                Total: <span className="font-semibold text-white">₹{(overview.total_revenue / 1000).toFixed(0)}K</span>
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Building2 size={28} />
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                <Target size={16} />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Total Projects</p>
            <p className="text-4xl font-bold">{totalProjects}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-purple-100">
                Avg: <span className="font-semibold text-white">{avgProjectsPerTenant}</span> per tenant
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Home size={28} />
              </div>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                <Award size={16} />
              </div>
            </div>
            <p className="text-orange-100 text-sm font-medium mb-1">Total Properties</p>
            <p className="text-4xl font-bold">{totalProperties}</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm text-orange-100">
                Avg: <span className="font-semibold text-white">{avgPropertiesPerTenant}</span> per tenant
              </p>
            </div>
          </div>
        </div>

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-cyan-500 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Total Staff Users</p>
                <p className="text-3xl font-bold text-gray-900">{totalStaff}</p>
                <p className="text-xs text-gray-500 mt-2">Across all tenants</p>
              </div>
              <div className="bg-cyan-100 p-4 rounded-xl">
                <UserCheck className="text-cyan-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Active Rate</p>
                <p className="text-3xl font-bold text-gray-900">{growthRate}%</p>
                <p className="text-xs text-gray-500 mt-2">Tenant activation</p>
              </div>
              <div className="bg-pink-100 p-4 rounded-xl">
                <Percent className="text-pink-600" size={32} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Avg Package Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{overview.total_tenants > 0 ? (overview.monthly_recurring_revenue / overview.total_tenants / 1000).toFixed(1) : 0}K
                </p>
                <p className="text-xs text-gray-500 mt-2">Per tenant/month</p>
              </div>
              <div className="bg-indigo-100 p-4 rounded-xl">
                <Package className="text-indigo-600" size={32} />
              </div>
            </div>
          </div>

          {/* Clickable Workforce Count Card */}
          <div 
            onClick={() => navigate('/workforce-map')}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-teal-500 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Scraped Workforce</p>
                <p className="text-3xl font-bold text-gray-900">{workforceCount}</p>
                <p className="text-xs text-teal-600 mt-2 font-semibold flex items-center gap-1">
                  Click to view map 
                  <MapPin size={14} className="group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
              <div className="bg-teal-100 p-4 rounded-xl group-hover:bg-teal-200 transition-colors">
                <Users className="text-teal-600" size={32} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={24} />
                Revenue Growth Trend
              </h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                6 Months
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `₹${(value / 1000).toFixed(1)}K`}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="url(#colorRevenue)" 
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t pt-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Start</p>
                <p className="text-lg font-bold text-gray-900">₹{(revenueTrend[0].revenue / 1000).toFixed(0)}K</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Growth</p>
                <p className="text-lg font-bold text-green-600">+{((revenueTrend[5].revenue / revenueTrend[0].revenue - 1) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Current</p>
                <p className="text-lg font-bold text-gray-900">₹{(revenueTrend[5].revenue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>

          {/* Subscription Timeline */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={24} />
                Subscription Timeline
              </h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                Status
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={timelineData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.value}`}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {timelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-2xl font-bold text-red-600">{timeline.previous}</p>
                <p className="text-xs text-red-700 font-medium mt-1">Expired</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl font-bold text-green-600">{timeline.present}</p>
                <p className="text-xs text-green-700 font-medium mt-1">Active</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-2xl font-bold text-blue-600">{timeline.future}</p>
                <p className="text-xs text-blue-700 font-medium mt-1">Upcoming</p>
              </div>
            </div>
          </div>

          {/* Package Distribution */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="text-purple-600" size={24} />
                Package Distribution
              </h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                By Tier
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={package_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="package_name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="tenant_count" fill="#8b5cf6" name="Tenants" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {package_distribution.map((pkg, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{pkg.package_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{pkg.tenant_count} tenants</span>
                    <span className="text-sm font-semibold text-purple-600">₹{(pkg.revenue / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Tenants by Properties */}
          {topTenants.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="text-blue-600" size={24} />
                  Top Performing Tenants
                </h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  By Properties
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTenants} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#888" />
                  <YAxis type="category" dataKey="name" width={100} stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="properties" fill="#f59e0b" name="Properties" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Tenants Table */}
        <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-gray-600" size={24} />
              Recent Tenants
            </h3>
            <button
              onClick={() => navigate('/admin/tenants')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            >
              View All Tenants
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase">Company</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase">Contact</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-700 uppercase">Email</th>
                  <th className="text-center py-4 px-4 text-sm font-bold text-gray-700 uppercase">Status</th>
                  <th className="text-center py-4 px-4 text-sm font-bold text-gray-700 uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent_tenants && recent_tenants.length > 0 ? (
                  recent_tenants.map((tenant, idx) => (
                    <tr key={tenant.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                            {tenant.company_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{tenant.company_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{tenant.name}</td>
                      <td className="py-4 px-4 text-gray-600">{tenant.email}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          tenant.status === 'active' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {tenant.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600 text-sm">
                        {new Date(tenant.created_at).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={48} className="text-gray-300" />
                        <p className="text-gray-500 font-medium">No tenants yet</p>
                        <button
                          onClick={() => navigate('/admin/tenants')}
                          className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                        >
                          Add First Tenant
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats Grid */}
        {tenantStats.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="text-blue-600" size={24} />
              Tenant-wise Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantStats.slice(0, 6).map((tenant, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-gray-900 text-sm truncate flex-1">{tenant.tenant_name}</h4>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{tenant.projects}</p>
                      <p className="text-xs text-gray-600">Projects</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{tenant.properties}</p>
                      <p className="text-xs text-gray-600">Properties</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">{tenant.staff}</p>
                      <p className="text-xs text-gray-600">Staff</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedSaaSDashboard;
