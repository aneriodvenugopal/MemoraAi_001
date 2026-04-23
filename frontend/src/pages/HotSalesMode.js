import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Flame, AlertTriangle, Phone, User, Clock,
  Plus, CheckCircle, XCircle, Bell, TrendingUp, Edit2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_COLORS = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  normal: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function HotSalesMode() {
  const navigate = useNavigate();
  const [hotSales, setHotSales] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hotStats, setHotStats] = useState({});
  const [alertStats, setAlertStats] = useState({});
  const [activeTab, setActiveTab] = useState("hot-sales");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customer_phone: "", customer_name: "", service_name: "", notes: "",
    priority: "high", amount: ""
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [sales, salesStats, alertsRes, alertStatsRes] = await Promise.all([
        axios.get(`${API}/memoraai/sales/hot?status=all`, { headers }),
        axios.get(`${API}/memoraai/sales/hot/stats`, { headers }),
        axios.get(`${API}/memoraai/sales/alerts?status=all`, { headers }),
        axios.get(`${API}/memoraai/sales/alerts/stats`, { headers }),
      ]);
      setHotSales(sales.data.hot_sales || []);
      setHotStats(salesStats.data);
      setAlerts(alertsRes.data.alerts || []);
      setAlertStats(alertStatsRes.data);
    } catch (e) {
      console.error("Failed to fetch sales data", e);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createHotSale = async () => {
    if (!form.customer_phone) return;
    setLoading(true);
    try {
      await axios.post(`${API}/memoraai/sales/hot`, {
        ...form,
        amount: form.amount ? Number(form.amount) : null,
      }, { headers });
      setForm({ customer_phone: "", customer_name: "", service_name: "", notes: "", priority: "high", amount: "" });
      setShowAdd(false);
      await fetchData();
    } catch (e) {
      console.error("Failed to create hot sale", e);
    }
    setLoading(false);
  };

  const updateSaleStatus = async (saleId, status) => {
    try {
      await axios.put(`${API}/memoraai/sales/hot/${saleId}`, { status }, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to update sale", e);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.put(`${API}/memoraai/sales/alerts/${alertId}/acknowledge`, {}, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to acknowledge alert", e);
    }
  };

  const actionAlert = async (alertId) => {
    try {
      await axios.put(`${API}/memoraai/sales/alerts/${alertId}/action`, { action_note: "Contacted customer" }, { headers });
      await fetchData();
    } catch (e) {
      console.error("Failed to action alert", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="hot-sales-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" /> Hot Sales & Alerts
            </h1>
            <p className="text-sm text-gray-500">Manual hot leads + AI-detected sales opportunities</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card data-testid="stat-active-sales">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{hotStats.active || 0}</div>
              <div className="text-xs text-gray-500">Active Hot Sales</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-urgent">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{hotStats.urgent || 0}</div>
              <div className="text-xs text-gray-500">Urgent</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-converted">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{hotStats.converted || 0}</div>
              <div className="text-xs text-gray-500">Converted</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-new-alerts">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{alertStats.new || 0}</div>
              <div className="text-xs text-gray-500">New Alerts</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4" data-testid="sales-tabs">
            <TabsTrigger value="hot-sales" data-testid="tab-hot-sales">
              <Flame className="w-4 h-4 mr-1" /> Hot Sales ({hotSales.filter(s => s.status === "active").length})
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              <Bell className="w-4 h-4 mr-1" /> AI Alerts ({alerts.filter(a => a.status === "new").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hot-sales">
            {!showAdd ? (
              <Button onClick={() => setShowAdd(true)} className="mb-4 gap-2" data-testid="add-hot-sale-btn">
                <Plus className="w-4 h-4" /> Add Hot Sale Entry
              </Button>
            ) : (
              <Card className="mb-4 border-orange-200 bg-orange-50/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> New Hot Sale Entry
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Customer Phone *" value={form.customer_phone}
                      onChange={e => setForm({ ...form, customer_phone: e.target.value })} data-testid="hot-sale-phone" />
                    <Input placeholder="Customer Name" value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })} data-testid="hot-sale-name" />
                    <Input placeholder="Service Name" value={form.service_name}
                      onChange={e => setForm({ ...form, service_name: e.target.value })} data-testid="hot-sale-service" />
                    <Input placeholder="Notes" value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="hot-sale-notes" />
                    <Input type="number" placeholder="Amount (optional)" value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })} data-testid="hot-sale-amount" />
                    <select
                      className="border rounded-md px-3 py-2 text-sm"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                      data-testid="hot-sale-priority"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={createHotSale} disabled={loading} data-testid="save-hot-sale">Save Hot Sale</Button>
                    <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {hotSales.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-gray-500">No hot sales yet. Add one manually or let AI detect them.</CardContent></Card>
              ) : (
                hotSales.map(sale => (
                  <Card key={sale.id} className={`${sale.status !== 'active' ? 'opacity-60' : ''}`} data-testid={`hot-sale-${sale.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[sale.priority] || PRIORITY_COLORS.normal}`}>
                            {sale.priority}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="font-medium">{sale.customer_phone}</span>
                              {sale.customer_name && <span className="text-gray-500">({sale.customer_name})</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {sale.service_name && <span className="mr-2">Service: {sale.service_name}</span>}
                              {sale.amount && <span className="mr-2">Amount: Rs.{sale.amount}</span>}
                              {sale.notes && <span>Note: {sale.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sale.status === "active" ? "default" : sale.status === "converted" ? "outline" : "secondary"}>
                            {sale.status}
                          </Badge>
                          {sale.status === "active" && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateSaleStatus(sale.id, "converted")} data-testid={`convert-sale-${sale.id}`}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Converted
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateSaleStatus(sale.id, "cancelled")} data-testid={`cancel-sale-${sale.id}`}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-gray-500">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No sales alerts yet. AI will detect buying intent from WhatsApp conversations automatically.
                </CardContent></Card>
              ) : (
                alerts.map(alert => (
                  <Card key={alert.id} className={`${alert.status === 'new' ? 'border-l-4 border-l-purple-500' : ''}`} data-testid={`alert-${alert.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">{alert.trigger_type}</Badge>
                            <span className="text-xs text-gray-400">Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">{alert.customer_phone}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 italic">"{alert.trigger_message}"</p>
                          {alert.recommended_action && (
                            <p className="text-xs text-blue-600 mt-1">{alert.recommended_action}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.status === "new" ? "default" : "secondary"}>{alert.status}</Badge>
                          {alert.status === "new" && (
                            <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)} data-testid={`ack-alert-${alert.id}`}>
                              Acknowledge
                            </Button>
                          )}
                          {alert.status === "acknowledged" && (
                            <Button size="sm" onClick={() => actionAlert(alert.id)} data-testid={`action-alert-${alert.id}`}>
                              Mark Actioned
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
