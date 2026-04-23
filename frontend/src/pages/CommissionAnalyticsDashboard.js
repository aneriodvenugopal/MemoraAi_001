/**
 * Commission Analytics Dashboard
 * Comprehensive commission tracking for Indian Real Estate
 * Features:
 * - Overview stats (Total, This Month, YTD, Pending)
 * - Monthly/Quarterly trends charts
 * - Top performers leaderboard
 * - Project-wise breakdown
 * - Staff performance details
 * - TDS/GST tracking (Indian compliance)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Building, Trophy,
  Calendar as CalendarIcon, RefreshCw, ArrowLeft, PieChart, BarChart3,
  Download, Filter, Clock, CheckCircle, AlertTriangle, IndianRupee,
  Target, Award, Crown, Medal, Star, ArrowUpRight, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Custom Progress Bar with color
const ColoredProgress = ({ value, color = "green", className = "" }) => {
  const colorClasses = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500"
  };
  
  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full transition-all duration-500 ${colorClasses[color]}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue", trend, onClick }) => {
  const bgColors = {
    green: "from-green-500 to-emerald-600",
    blue: "from-blue-500 to-indigo-600",
    yellow: "from-yellow-500 to-orange-500",
    red: "from-red-500 to-rose-600",
    purple: "from-purple-500 to-violet-600",
    orange: "from-orange-500 to-amber-600"
  };
  
  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all ${onClick ? 'hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className={`bg-gradient-to-r ${bgColors[color]} p-4 text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm opacity-90">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && <p className="text-xs opacity-80 mt-1">{subtitle}</p>}
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Icon className="w-6 h-6" />
            </div>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend >= 0 ? '+' : ''}{trend}% vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Leaderboard Item Component
const LeaderboardItem = ({ rank, name, amount, count, onClick }) => {
  const rankIcons = {
    1: { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-50" },
    2: { icon: Medal, color: "text-gray-400", bg: "bg-gray-50" },
    3: { icon: Award, color: "text-orange-400", bg: "bg-orange-50" }
  };
  
  const rankStyle = rankIcons[rank] || { icon: Star, color: "text-blue-400", bg: "bg-blue-50" };
  const RankIcon = rankStyle.icon;
  
  return (
    <div 
      className={`flex items-center gap-4 p-3 rounded-lg ${rankStyle.bg} hover:shadow-md transition-all cursor-pointer`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rank <= 3 ? '' : 'bg-gray-100'}`}>
        {rank <= 3 ? (
          <RankIcon className={`w-6 h-6 ${rankStyle.color}`} />
        ) : (
          <span className="text-lg font-bold text-gray-500">#{rank}</span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{count} transactions</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-green-600">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
};

// Format currency helper
const formatCurrency = (amount) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};

const CommissionAnalyticsDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [projectBreakdown, setProjectBreakdown] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState(null);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [trendPeriod, setTrendPeriod] = useState('monthly');
  const [projects, setProjects] = useState([]);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboard(),
        fetchTrends(),
        fetchLeaderboard(),
        fetchProjectBreakdown(),
        fetchProjects()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDashboard = async () => {
    try {
      let url = `${API_URL}/api/commission-analytics/dashboard`;
      const params = new URLSearchParams();
      if (selectedProject && selectedProject !== 'all') {
        params.append('project_id', selectedProject);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setDashboard(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/commission-analytics/trends?period=${trendPeriod}&months=12`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setTrends(data.trends || []);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/commission-analytics/top-performers?limit=10&period=${selectedPeriod}`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchProjectBreakdown = async () => {
    try {
      const res = await fetch(`${API_URL}/api/commission-analytics/project-breakdown`, { headers });
      const data = await res.json();
      if (data.success) {
        setProjectBreakdown(data.breakdown || []);
      }
    } catch (err) {
      console.error('Error fetching project breakdown:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchStaffPerformance = async (staffId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/commission-analytics/staff-performance/${staffId}`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setStaffPerformance(data);
      }
    } catch (err) {
      console.error('Error fetching staff performance:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [selectedProject]);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod]);

  useEffect(() => {
    fetchTrends();
  }, [trendPeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  // Calculate max for trend chart
  const maxTrendValue = Math.max(...trends.map(t => t.commission), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="commission-analytics-page">
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
                <IndianRupee className="w-7 h-7 text-green-600" />
                Commission Analytics
              </h1>
              <p className="text-gray-500 mt-1">
                Track earnings, performance & payouts
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
            <Button onClick={() => navigate('/commissions')} data-testid="manage-commissions-btn">
              <DollarSign className="w-4 h-4 mr-2" />
              Manage Commissions
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Commission"
              value={formatCurrency(dashboard.overview.total_commission)}
              subtitle={`${dashboard.overview.total_transactions} transactions`}
              icon={IndianRupee}
              color="green"
            />
            <StatCard
              title="This Month"
              value={formatCurrency(dashboard.this_month.commission)}
              subtitle={`Net: ${formatCurrency(dashboard.this_month.net)}`}
              icon={CalendarIcon}
              color="blue"
              trend={dashboard.this_month.mom_growth}
            />
            <StatCard
              title="Year-to-Date"
              value={formatCurrency(dashboard.ytd.commission)}
              subtitle={`${dashboard.ytd.transactions} transactions`}
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              title="Pending Payout"
              value={formatCurrency(dashboard.by_status.approved?.amount || 0)}
              subtitle={`${dashboard.by_status.approved?.count || 0} approved`}
              icon={Clock}
              color="yellow"
            />
          </div>
        )}

        {/* TDS/Tax Summary Card */}
        {dashboard && (
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500 shadow-lg">
                    <Percent className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Tax Deducted (TDS @ 5%)</h3>
                    <p className="text-sm text-gray-500">Total TDS deducted from commissions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(dashboard.overview.total_tds)}</p>
                  <p className="text-sm text-gray-500">Net Payable: {formatCurrency(dashboard.overview.total_net)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-48">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Project</label>
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger data-testid="period-filter">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <PieChart className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends" data-testid="trends-tab">
              <BarChart3 className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="leaderboard-tab">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
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
                    <PieChart className="w-5 h-5 text-blue-500" />
                    Commission by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard && (
                    <div className="space-y-4">
                      {Object.entries(dashboard.by_status).map(([status, data]) => {
                        const total = dashboard.overview.total_transactions || 1;
                        const percentage = Math.round((data.count / total) * 100);
                        const colors = {
                          pending: { bar: "yellow", text: "text-yellow-700" },
                          approved: { bar: "blue", text: "text-blue-700" },
                          paid: { bar: "green", text: "text-green-700" },
                          cancelled: { bar: "red", text: "text-red-700" },
                          on_hold: { bar: "orange", text: "text-orange-700" }
                        };
                        const color = colors[status] || colors.pending;
                        
                        if (data.count === 0) return null;
                        
                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className={`font-medium capitalize ${color.text}`}>{status.replace('_', ' ')}</span>
                              <span className="text-gray-600">{data.count} ({percentage}%) - {formatCurrency(data.amount)}</span>
                            </div>
                            <ColoredProgress value={percentage} color={color.bar} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Type Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Commission by Type
                  </CardTitle>
                  <CardDescription>
                    Direct (own sales) vs Gap (team sales)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboard && (
                    <div className="space-y-6">
                      {/* Direct Commission */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h4 className="font-semibold text-green-800">Direct Commission</h4>
                            <p className="text-sm text-green-600">{dashboard.by_type.direct.count} transactions</p>
                          </div>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(dashboard.by_type.direct.amount)}
                          </p>
                        </div>
                        <ColoredProgress 
                          value={(dashboard.by_type.direct.count / (dashboard.overview.total_transactions || 1)) * 100} 
                          color="green" 
                        />
                      </div>
                      
                      {/* Gap Commission */}
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <h4 className="font-semibold text-purple-800">Gap Commission</h4>
                            <p className="text-sm text-purple-600">{dashboard.by_type.gap.count} transactions</p>
                          </div>
                          <p className="text-2xl font-bold text-purple-700">
                            {formatCurrency(dashboard.by_type.gap.amount)}
                          </p>
                        </div>
                        <ColoredProgress 
                          value={(dashboard.by_type.gap.count / (dashboard.overview.total_transactions || 1)) * 100} 
                          color="purple" 
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Avg per Transaction</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(dashboard?.overview.average_commission || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">This Month Count</p>
                      <p className="text-xl font-bold text-gray-900">
                        {dashboard?.this_month.transactions || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">YTD Transactions</p>
                      <p className="text-xl font-bold text-gray-900">
                        {dashboard?.ytd.transactions || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Paid Out</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(dashboard?.by_status.paid?.amount || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Commission Trends
                  </CardTitle>
                  <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {trends.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium">No Trend Data</p>
                    <p className="text-sm">Commission data will appear here once available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Simple Bar Chart */}
                    <div className="flex items-end gap-2 h-64 border-b border-l border-gray-200 p-4">
                      {trends.map((t, idx) => (
                        <div 
                          key={t.period} 
                          className="flex-1 flex flex-col items-center justify-end h-full"
                        >
                          <div 
                            className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-md transition-all duration-300 hover:from-green-600 hover:to-emerald-500 relative group"
                            style={{ height: `${(t.commission / maxTrendValue) * 100}%`, minHeight: '4px' }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatCurrency(t.commission)}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                            {t.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Trend Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Period</th>
                            <th className="text-right py-2">Gross</th>
                            <th className="text-right py-2">TDS</th>
                            <th className="text-right py-2">Net</th>
                            <th className="text-right py-2">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trends.map((t) => (
                            <tr key={t.period} className="border-b hover:bg-gray-50">
                              <td className="py-2 font-medium">{t.label}</td>
                              <td className="py-2 text-right">{formatCurrency(t.commission)}</td>
                              <td className="py-2 text-right text-orange-600">{formatCurrency(t.tds)}</td>
                              <td className="py-2 text-right text-green-600">{formatCurrency(t.net)}</td>
                              <td className="py-2 text-right">{t.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Staff ranked by commission earned ({selectedPeriod.replace('_', ' ')})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium">No Data Yet</p>
                    <p className="text-sm">Commission earnings will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((performer) => (
                      <LeaderboardItem
                        key={performer.staff_id}
                        rank={performer.rank}
                        name={performer.staff_name}
                        amount={performer.total_commission}
                        count={performer.transaction_count}
                        onClick={() => {
                          fetchStaffPerformance(performer.staff_id);
                          setActiveTab('staff-detail');
                        }}
                      />
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
                  Project-wise Commission
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectBreakdown.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Building className="w-16 h-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg font-medium">No Project Data</p>
                    <p className="text-sm">Commission by project will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectBreakdown.map((project) => (
                      <div
                        key={project.project_id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{project.project_name}</h4>
                            <p className="text-sm text-gray-500">
                              {project.transaction_count} transactions • {project.unique_staff_count} staff
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(project.total_commission)}
                            </p>
                            <Badge variant="outline">{project.percentage_of_total}% of total</Badge>
                          </div>
                        </div>
                        <ColoredProgress 
                          value={project.percentage_of_total} 
                          color="green" 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Detail Tab (Hidden, shown when clicking leaderboard item) */}
          <TabsContent value="staff-detail" className="mt-4">
            {staffPerformance && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        {staffPerformance.staff.name}
                      </CardTitle>
                      <CardDescription>
                        {staffPerformance.staff.email} • {staffPerformance.staff.phone}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('leaderboard')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Leaderboard
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-green-600">Total Earned</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(staffPerformance.summary.total_commission)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-600">Net (After TDS)</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(staffPerformance.summary.total_net)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-sm text-purple-600">Transactions</p>
                      <p className="text-xl font-bold text-purple-700">
                        {staffPerformance.summary.transaction_count}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg text-center">
                      <p className="text-sm text-orange-600">Avg/Month</p>
                      <p className="text-xl font-bold text-orange-700">
                        {formatCurrency(staffPerformance.summary.average_monthly)}
                      </p>
                    </div>
                  </div>

                  {/* By Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Direct Sales</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(staffPerformance.by_type.direct.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {staffPerformance.by_type.direct.count} transactions
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Gap (Team) Sales</h4>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(staffPerformance.by_type.gap.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {staffPerformance.by_type.gap.count} transactions
                      </p>
                    </div>
                  </div>

                  {/* Monthly Trend */}
                  {staffPerformance.monthly_trend.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Monthly Performance</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Month</th>
                              <th className="text-right py-2">Commission</th>
                              <th className="text-right py-2">Transactions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffPerformance.monthly_trend.map((m) => (
                              <tr key={m.month} className="border-b hover:bg-gray-50">
                                <td className="py-2 font-medium">{m.month}</td>
                                <td className="py-2 text-right text-green-600">
                                  {formatCurrency(m.commission)}
                                </td>
                                <td className="py-2 text-right">{m.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommissionAnalyticsDashboard;
