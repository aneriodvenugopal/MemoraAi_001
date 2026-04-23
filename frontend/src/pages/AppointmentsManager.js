import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, Calendar, Clock, Phone, User, CheckCircle,
  XCircle, AlertTriangle, Edit2, Trash2, Search
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLES = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-700",
};

export default function AppointmentsManager() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [services, setServices] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState({ status: "", date: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_phone: "", customer_name: "", service_name: "",
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_time: "10:00", duration_mins: 30, amount: 0, notes: "", source: "manual"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.date) params.set("date", filter.date);
      if (filter.search) params.set("service", filter.search);

      const [aptsRes, todayRes, svcRes] = await Promise.all([
        axios.get(`${API}/memoraai/appointments?${params}`, { headers }),
        axios.get(`${API}/memoraai/appointments/today/summary`, { headers }),
        axios.get(`${API}/memoraai/services`, { headers }),
      ]);
      setAppointments(aptsRes.data.appointments || []);
      setTodaySummary(todayRes.data);
      setServices(svcRes.data.services || []);
    } catch (e) { console.error(e); }
  }, [filter, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createAppointment = async () => {
    if (!form.customer_phone || !form.service_name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/memoraai/appointments`, {
        ...form,
        amount: Number(form.amount) || 0,
        duration_mins: Number(form.duration_mins) || 30,
      }, { headers });
      setForm({ customer_phone: "", customer_name: "", service_name: "", appointment_date: new Date().toISOString().split("T")[0], appointment_time: "10:00", duration_mins: 30, amount: 0, notes: "", source: "manual" });
      setShowAdd(false);
      await fetchData();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === "completed") await axios.post(`${API}/memoraai/appointments/${id}/complete`, {}, { headers });
      else if (status === "no_show") await axios.post(`${API}/memoraai/appointments/${id}/no-show`, {}, { headers });
      else await axios.put(`${API}/memoraai/appointments/${id}`, { status }, { headers });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await axios.delete(`${API}/memoraai/appointments/${id}`, { headers });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="appointments-page">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Appointments & Bookings</h1>
            <p className="text-sm text-gray-500">Manage customer appointments across all services</p>
          </div>
          <Button onClick={() => navigate("/memoraai-analytics")} variant="outline" className="gap-1" data-testid="analytics-btn">
            <Calendar className="w-4 h-4" /> Analytics
          </Button>
        </div>

        {/* Today's Summary */}
        {todaySummary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="today-summary">
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-blue-600">{todaySummary.total}</div><div className="text-xs text-gray-500">Today Total</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-amber-600">{todaySummary.scheduled}</div><div className="text-xs text-gray-500">Scheduled</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-green-600">{todaySummary.completed}</div><div className="text-xs text-gray-500">Completed</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-red-500">{todaySummary.cancelled}</div><div className="text-xs text-gray-500">Cancelled</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-gray-500">{todaySummary.no_show}</div><div className="text-xs text-gray-500">No Show</div></CardContent></Card>
          </div>
        )}

        {/* Filters + Add */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-1" data-testid="add-appointment-btn">
            <Plus className="w-4 h-4" /> New Appointment
          </Button>
          <div className="flex gap-1 ml-auto">
            {["", "scheduled", "completed", "cancelled", "no_show"].map(s => (
              <Button key={s} size="sm" variant={filter.status === s ? "default" : "outline"}
                onClick={() => setFilter(f => ({ ...f, status: s }))} data-testid={`filter-${s || "all"}`}>
                {s ? s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "All"}
              </Button>
            ))}
          </div>
          <Input type="date" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))}
            className="w-40" data-testid="filter-date" />
        </div>

        {/* Add Form */}
        {showAdd && (
          <Card className="mb-4 border-blue-200 bg-blue-50/30" data-testid="add-appointment-form">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">New Appointment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Customer Phone *" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} data-testid="apt-phone" />
                <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} data-testid="apt-name" />
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.service_name}
                  onChange={e => {
                    const svc = services.find(s => s.name === e.target.value);
                    setForm(f => ({ ...f, service_name: e.target.value, amount: svc?.price || 0, duration_mins: svc?.duration_mins || 30 }));
                  }} data-testid="apt-service">
                  <option value="">Select Service *</option>
                  {services.map(s => <option key={s.id} value={s.name}>{s.name} - Rs.{s.price}</option>)}
                </select>
                <Input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} data-testid="apt-date" />
                <Input type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} data-testid="apt-time" />
                <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} data-testid="apt-amount" />
                <Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="md:col-span-2" data-testid="apt-notes" />
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} data-testid="apt-source">
                  <option value="manual">Manual</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="online">Online</option>
                  <option value="call">Phone Call</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={createAppointment} disabled={loading} data-testid="save-appointment">Save Appointment</Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments List */}
        <div className="space-y-2">
          {appointments.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-gray-500">No appointments found. Create your first appointment above.</CardContent></Card>
          ) : appointments.map(apt => (
            <Card key={apt.id} className={`${apt.status !== "scheduled" ? "opacity-70" : ""}`} data-testid={`appointment-${apt.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <Badge className={`${STATUS_STYLES[apt.status] || STATUS_STYLES.scheduled} text-xs`}>{apt.status}</Badge>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Phone className="w-3 h-3 text-gray-400" /> {apt.customer_phone}
                        {apt.customer_name && <span className="text-gray-500">({apt.customer_name})</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="font-medium text-purple-600">{apt.service_name}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.appointment_date}</span>
                        {apt.appointment_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.appointment_time}</span>}
                        {apt.amount > 0 && <span>Rs.{apt.amount}</span>}
                        {apt.source !== "manual" && <Badge variant="outline" className="text-[10px]">{apt.source}</Badge>}
                      </div>
                      {apt.notes && <p className="text-xs text-gray-400 mt-1">{apt.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {apt.status === "scheduled" && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 gap-1" onClick={() => updateStatus(apt.id, "completed")} data-testid={`complete-${apt.id}`}>
                          <CheckCircle className="w-3 h-3" /> Done
                        </Button>
                        <Button size="sm" variant="ghost" className="text-amber-600" onClick={() => updateStatus(apt.id, "no_show")} data-testid={`noshow-${apt.id}`}>
                          <AlertTriangle className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(apt.id, "cancelled")} data-testid={`cancel-${apt.id}`}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => deleteAppointment(apt.id)} data-testid={`delete-${apt.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
