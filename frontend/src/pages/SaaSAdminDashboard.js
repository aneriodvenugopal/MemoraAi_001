import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building, Users, MessageSquare, Brain, Calendar,
  Flame, Shield, CheckCircle, XCircle, Globe, ChevronRight, BarChart3
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaaSAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/memoraai/saas-admin/dashboard`, { headers });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>;
  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">Access denied. Super admin only.</div>;

  const ov = data.overview;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="saas-admin-dashboard">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
          <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900">SaaS Admin Panel</h1><p className="text-sm text-gray-500">MemoraAI Platform Overview</p></div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6" data-testid="saas-kpis">
          <KPI icon={Building} label="Tenants" value={ov.total_tenants} color="violet" />
          <KPI icon={Users} label="Total Users" value={ov.total_users} color="blue" />
          <KPI icon={MessageSquare} label="Conversations" value={ov.total_conversations} color="green" />
          <KPI icon={Brain} label="Memories" value={ov.total_memories} color="purple" />
          <KPI icon={Calendar} label="Appointments" value={ov.total_appointments} color="cyan" />
          <KPI icon={Flame} label="Hot Sales" value={ov.total_hot_sales} color="orange" />
          <KPI icon={MessageSquare} label="Msgs Today" value={ov.messages_today} color="emerald" />
        </div>

        {/* WABA Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold text-green-700">{ov.waba_configured}</p><p className="text-xs text-gray-500">WABA Active</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><XCircle className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold text-yellow-700">{ov.waba_pending}</p><p className="text-xs text-gray-500">WABA Pending Setup</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-blue-700">{ov.messages_week}</p><p className="text-xs text-gray-500">Messages This Week</p></div>
          </CardContent></Card>
        </div>

        {/* Tenants Table */}
        <Card data-testid="tenants-table">
          <CardHeader><CardTitle className="text-base">Registered Businesses ({data.tenants.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-center">Users</th>
                  <th className="pb-2 font-medium text-center">Chats</th>
                  <th className="pb-2 font-medium text-center">Services</th>
                  <th className="pb-2 font-medium text-center">WABA</th>
                </tr></thead>
                <tbody>
                  {data.tenants.map(t => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5"><span className="font-medium text-gray-900">{t.name || 'Unnamed'}</span></td>
                      <td className="py-2.5"><Badge variant="outline" className="text-[10px]">{t.category_name}</Badge></td>
                      <td className="py-2.5 text-center">{t.users}</td>
                      <td className="py-2.5 text-center">{t.conversations}</td>
                      <td className="py-2.5 text-center">{t.services}</td>
                      <td className="py-2.5 text-center">
                        {t.waba_active ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Admin Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6" data-testid="admin-links">
          {[
            { label: "Industry Pages", icon: Globe, path: "/admin-industries" },
            { label: "All Users", icon: Users, path: "/settings/role-assignments" },
            { label: "Team Inbox", icon: MessageSquare, path: "/team-inbox" },
            { label: "Analytics", icon: BarChart3, path: "/memoraai-analytics" },
          ].map((l, i) => (
            <Button key={i} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate(l.path)} data-testid={`admin-link-${i}`}>
              <l.icon className="w-5 h-5 text-violet-600" /><span className="text-xs">{l.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }) {
  const colors = { violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", cyan: "bg-cyan-50 text-cyan-600", orange: "bg-orange-50 text-orange-600", emerald: "bg-emerald-50 text-emerald-600" };
  const cls = colors[color] || colors.violet;
  return (
    <Card><CardContent className="p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${cls.split(' ')[1]}`} />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </CardContent></Card>
  );
}
