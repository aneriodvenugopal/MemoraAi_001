import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, BarChart3, TrendingUp, Users, IndianRupee,
  Calendar, CheckCircle, XCircle, Clock, Flame, Brain, Bell
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, bd] = await Promise.all([
        axios.get(`${API}/memoraai/analytics/overview?period=${period}`, { headers }),
        axios.get(`${API}/memoraai/analytics/services-breakdown`, { headers }),
      ]);
      setOverview(ov.data);
      setBreakdown(bd.data.breakdown || []);
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    }
    setLoading(false);
  }, [period, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  const { appointments, revenue, customers, whatsapp, popular_services, daily_trend } = overview;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="analytics-dashboard">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{overview.category_name} Analytics</h1>
              <p className="text-sm text-gray-500">Business performance insights</p>
            </div>
          </div>
          <div className="flex gap-1" data-testid="period-selector">
            {["today", "week", "month"].map(p => (
              <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)} data-testid={`period-${p}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard icon={Calendar} label="Total Appointments" value={appointments.total} color="blue" testId="kpi-appointments" />
          <KPICard icon={CheckCircle} label="Completed" value={appointments.completed} sub={`${appointments.completion_rate}%`} color="green" testId="kpi-completed" />
          <KPICard icon={Users} label="Unique Customers" value={customers.unique} sub={`${customers.retention_rate}% repeat`} color="purple" testId="kpi-customers" />
          <KPICard icon={IndianRupee} label="Revenue" value={`Rs.${revenue.total.toLocaleString()}`} sub={`This period: Rs.${revenue.this_period.toLocaleString()}`} color="emerald" testId="kpi-revenue" />
        </div>

        {/* WhatsApp & AI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MiniStat icon={Users} label="WhatsApp Leads" value={whatsapp.total_leads} color="green" />
          <MiniStat icon={TrendingUp} label="New Leads" value={whatsapp.new_leads} color="blue" />
          <MiniStat icon={Flame} label="Hot Sales" value={whatsapp.hot_sales} color="orange" />
          <MiniStat icon={Bell} label="AI Alerts" value={whatsapp.new_alerts} color="red" />
          <MiniStat icon={Brain} label="Memories" value={whatsapp.memories} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <Card data-testid="daily-trend-card">
            <CardHeader><CardTitle className="text-base">Appointment Trend (7 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {daily_trend.map((d, i) => {
                  const maxVal = Math.max(...daily_trend.map(x => x.count), 1);
                  const height = Math.max(4, (d.count / maxVal) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">{d.count}</span>
                      <div className="w-full bg-purple-500 rounded-t" style={{ height: `${height}%` }} />
                      <span className="text-[10px] text-gray-400">{d.date.split(" ")[1]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Popular Services */}
          <Card data-testid="popular-services-card">
            <CardHeader><CardTitle className="text-base">Popular Services</CardTitle></CardHeader>
            <CardContent>
              {popular_services.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No appointment data yet</p>
              ) : (
                <div className="space-y-3">
                  {popular_services.map((s, i) => {
                    const maxCount = popular_services[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-36 truncate">{s.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-8 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Breakdown Table */}
          <Card className="lg:col-span-2" data-testid="service-breakdown-card">
            <CardHeader><CardTitle className="text-base">Service Performance</CardTitle></CardHeader>
            <CardContent>
              {breakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No data yet. Create appointments to see analytics.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Service</th>
                        <th className="pb-2 font-medium text-center">Bookings</th>
                        <th className="pb-2 font-medium text-center">Completed</th>
                        <th className="pb-2 font-medium text-center">Cancelled</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                        <th className="pb-2 font-medium text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium text-gray-900">{row.service}</td>
                          <td className="py-2 text-center">{row.total_bookings}</td>
                          <td className="py-2 text-center text-green-600">{row.completed}</td>
                          <td className="py-2 text-center text-red-500">{row.cancelled}</td>
                          <td className="py-2 text-right">Rs.{row.revenue.toLocaleString()}</td>
                          <td className="py-2 text-right">
                            <Badge variant={row.completion_rate >= 80 ? "default" : "secondary"} className="text-xs">
                              {row.completion_rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Status Breakdown */}
          <Card data-testid="status-breakdown-card">
            <CardHeader><CardTitle className="text-base">Appointment Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatusBar label="Scheduled" value={appointments.this_period} color="bg-blue-500" />
                <StatusBar label="Completed" value={appointments.completed} color="bg-green-500" />
                <StatusBar label="Cancelled" value={appointments.cancelled} color="bg-red-400" />
                <StatusBar label="No Show" value={appointments.no_show} color="bg-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Customer Metrics */}
          <Card data-testid="customer-metrics-card">
            <CardHeader><CardTitle className="text-base">Customer Insights</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">{customers.unique}</p>
                  <p className="text-xs text-gray-500">Unique Customers</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{customers.repeat}</p>
                  <p className="text-xs text-gray-500">Repeat Customers</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg col-span-2">
                  <p className="text-2xl font-bold text-blue-700">{customers.retention_rate}%</p>
                  <p className="text-xs text-gray-500">Customer Retention Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, testId }) {
  const colors = { blue: "from-blue-500 to-blue-600", green: "from-green-500 to-green-600", purple: "from-purple-500 to-purple-600", emerald: "from-emerald-500 to-emerald-600" };
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colors[color] || colors.blue} shadow`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  const colors = { green: "text-green-600 bg-green-50", blue: "text-blue-600 bg-blue-50", orange: "text-orange-600 bg-orange-50", red: "text-red-600 bg-red-50", purple: "text-purple-600 bg-purple-50" };
  const cls = colors[color] || colors.blue;
  return (
    <div className={`rounded-lg p-3 ${cls.split(" ")[1]}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cls.split(" ")[0]}`} />
        <span className={`text-lg font-bold ${cls.split(" ")[0]}`}>{value}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}
