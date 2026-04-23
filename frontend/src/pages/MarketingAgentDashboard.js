import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';
import {
  Users, TrendingUp, DollarSign, AlertCircle, Bell,
  Calendar, Package, FileText, CheckCircle, Clock, XCircle,
  ArrowRight, Phone, Mail, Target, Award, Activity
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function MarketingAgentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [paymentFollowups, setPaymentFollowups] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    fetchCommissions();
    fetchAnalytics();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiInstance.get('/marketing-dashboard/overview');
      
      if (response.data.success) {
        setOverview(response.data.overview);
        setRecentLeads(response.data.recent_leads || []);
        setPaymentFollowups(response.data.payment_followups || []);
        setNotifications(response.data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard');
      
      if (err.response?.status === 403) {
        alert('Access denied. Marketing Agent role required.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await apiInstance.get('/marketing-dashboard/my-commissions');
      if (response.data.success) {
        setCommissions(response.data.commissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch commissions:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await apiInstance.get('/marketing-dashboard/analytics');
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Loading Marketing Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
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

  if (!overview) {
    return null;
  }

  // Prepare chart data
  const leadsStatusData = Object.entries(overview.leads_by_status || {}).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const monthlyPerformance = analytics?.monthly_performance || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Marketing Agent Dashboard
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Track Your Performance & Commissions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'leads'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My Leads
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'commissions'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Commissions
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Users size={28} />
              </div>
              <Target size={20} className="opacity-60" />
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">My Leads</p>
            <p className="text-4xl font-bold">{overview.total_leads}</p>
            <p className="text-xs text-blue-100 mt-2">{overview.recent_leads_count} new this week</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <DollarSign size={28} />
              </div>
              <Award size={20} className="opacity-60" />
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Total Commission</p>
            <p className="text-4xl font-bold">₹{(overview.total_commission / 1000).toFixed(0)}K</p>
            <p className="text-xs text-green-100 mt-2">
              Paid: ₹{(overview.paid_commission / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Package size={28} />
              </div>
              <CheckCircle size={20} className="opacity-60" />
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Bookings</p>
            <p className="text-4xl font-bold">{overview.total_bookings}</p>
            <p className="text-xs text-purple-100 mt-2">
              {analytics?.conversion_rate || 0}% conversion rate
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Clock size={28} />
              </div>
              <AlertCircle size={20} className="opacity-60" />
            </div>
            <p className="text-orange-100 text-sm font-medium mb-1">Payment Followups</p>
            <p className="text-4xl font-bold">{overview.payment_followups}</p>
            <p className="text-xs text-orange-100 mt-2">Require attention</p>
          </div>
        </div>

        {/* Charts Row */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Lead Status Distribution */}
              {leadsStatusData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity className="text-blue-600" size={24} />
                    Lead Status Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={leadsStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {leadsStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly Performance */}
              {monthlyPerformance.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-green-600" size={24} />
                    Monthly Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
                      <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} name="Bookings" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent Leads */}
            {recentLeads.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="text-blue-600" size={24} />
                  Recent Leads
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Phone</th>
                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Project</th>
                        <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Status</th>
                        <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map((lead, idx) => (
                        <tr key={lead.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="py-3 px-4 font-medium text-gray-900">{lead.name}</td>
                          <td className="py-3 px-4 text-gray-700">{lead.phone}</td>
                          <td className="py-3 px-4 text-gray-700">{lead.project_name || 'N/A'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                              {lead.status_name || 'New'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-600">
                            {new Date(lead.created_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Followups */}
            {paymentFollowups.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Clock className="text-orange-600" size={24} />
                  Payment Followups Required
                </h3>
                <div className="space-y-4">
                  {paymentFollowups.map((followup, idx) => (
                    <div
                      key={followup.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        followup.is_overdue
                          ? 'border-red-500 bg-red-50'
                          : 'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">
                            {followup.customer_name || 'Customer'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Property: {followup.property_name || 'N/A'} | Project: {followup.project_name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Balance: <span className="font-semibold">₹{(followup.balance_amount / 100000).toFixed(2)}L</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            followup.is_overdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {followup.is_overdue ? 'OVERDUE' : 'DUE SOON'}
                          </span>
                          {followup.next_payment_date && (
                            <p className="text-xs text-gray-600 mt-2">
                              {new Date(followup.next_payment_date).toLocaleDateString('en-IN')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1">
                          <Phone size={12} /> Call
                        </button>
                        <button className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1">
                          <Mail size={12} /> Email
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="text-green-600" size={28} />
                My Commissions
              </h3>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Earned</p>
                <p className="text-3xl font-bold text-green-600">
                  ₹{(overview.total_commission / 100000).toFixed(2)}L
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700 font-medium mb-1">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(overview.paid_commission / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Pending</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{(overview.pending_commission / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{overview.total_bookings}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Project</th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Commission</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission, idx) => (
                    <tr key={commission.id} className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {commission.property_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{commission.project_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-600">
                        ₹{(commission.commission_amount / 1000).toFixed(1)}K
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          commission.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : commission.status === 'pending'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {commission.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {new Date(commission.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && activeTab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="text-purple-600" size={24} />
              Recent Notifications
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {notifications.length}
              </span>
            </h3>
            <div className="space-y-3">
              {notifications.map((notif, idx) => (
                <div key={notif.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{notif.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notif.created_at).toLocaleString('en-IN')}
                      </p>
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

export default MarketingAgentDashboard;
