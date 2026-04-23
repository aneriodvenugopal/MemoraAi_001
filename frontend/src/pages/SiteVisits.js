/**
 * Site Visit Management
 * - Schedule site visits for leads/customers
 * - Assign staff to visits
 * - Track visit status and outcomes
 * - Simple workflow: Schedule -> Confirm -> Complete/Cancel
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Clock, User, MapPin, Phone, Plus, Check, X,
  Play, Eye, Edit2, Trash2, Users, Building, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, RefreshCw, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
  rescheduled: 'bg-orange-100 text-orange-800'
};

// Outcome colors
const OUTCOME_COLORS = {
  interested: 'bg-green-100 text-green-800',
  not_interested: 'bg-red-100 text-red-800',
  needs_followup: 'bg-yellow-100 text-yellow-800',
  booking_initiated: 'bg-purple-100 text-purple-800',
  negotiating: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800'
};

const SiteVisits = () => {
  const { user } = useAuth();
  
  // State
  const [visits, setVisits] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({
    project_id: '',
    visitor_type: 'lead',
    visitor_name: '',
    visitor_mobile: '',
    visitor_email: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    assigned_to: '',
    staff_notes: ''
  });
  
  // Complete form
  const [completeForm, setCompleteForm] = useState({
    outcome: '',
    feedback: '',
    staff_notes: '',
    followup_required: false,
    followup_date: '',
    followup_notes: ''
  });
  
  // Cancel form
  const [cancelForm, setCancelForm] = useState({
    cancellation_reason: '',
    reschedule_date: '',
    reschedule_time: ''
  });
  
  // Filters
  const [filters, setFilters] = useState({
    project_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    loadData();
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/site-visits/calendar/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setCalendarConnected(response.data.calendar_connected);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const handleSyncToCalendar = async (visitId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/site-visits/${visitId}/sync-calendar`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success('📅 Synced to Google Calendar!');
        if (response.data.calendar_link) {
          window.open(response.data.calendar_link, '_blank');
        }
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync to calendar');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadTodayVisits(),
      loadVisits(),
      loadStats(),
      loadProjects(),
      loadStaff()
    ]);
    setLoading(false);
  };

  const loadTodayVisits = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/site-visits/today`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setTodayVisits(response.data.visits);
      }
    } catch (error) {
      console.error('Error loading today visits:', error);
    }
  };

  const loadVisits = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await axios.get(`${API_URL}/api/site-visits?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setVisits(response.data.visits);
      }
    } catch (error) {
      console.error('Error loading visits:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/site-visits/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.projects) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.users) {
        setStaff(response.data.users);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const handleScheduleVisit = async () => {
    if (!scheduleForm.project_id || !scheduleForm.visitor_name || 
        !scheduleForm.visitor_mobile || !scheduleForm.scheduled_date || 
        !scheduleForm.scheduled_time || !scheduleForm.assigned_to) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/site-visits`,
        scheduleForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        let message = response.data.message;
        if (response.data.calendar_synced) {
          message += ' 📅 Synced to Google Calendar!';
        }
        toast.success(message);
        setShowScheduleModal(false);
        resetScheduleForm();
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule visit');
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      project_id: '',
      visitor_type: 'lead',
      visitor_name: '',
      visitor_mobile: '',
      visitor_email: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      assigned_to: '',
      staff_notes: ''
    });
  };

  const handleConfirmVisit = async (visitId) => {
    try {
      await axios.post(
        `${API_URL}/api/site-visits/${visitId}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Visit confirmed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm');
    }
  };

  const handleStartVisit = async (visitId) => {
    try {
      await axios.post(
        `${API_URL}/api/site-visits/${visitId}/start`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Visit started');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start');
    }
  };

  const handleCompleteVisit = async () => {
    if (!completeForm.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    
    try {
      await axios.post(
        `${API_URL}/api/site-visits/${selectedVisit.id}/complete`,
        completeForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Visit completed');
      setShowCompleteModal(false);
      setSelectedVisit(null);
      setCompleteForm({
        outcome: '',
        feedback: '',
        staff_notes: '',
        followup_required: false,
        followup_date: '',
        followup_notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete');
    }
  };

  const handleCancelVisit = async () => {
    if (!cancelForm.cancellation_reason) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      await axios.post(
        `${API_URL}/api/site-visits/${selectedVisit.id}/cancel`,
        cancelForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(cancelForm.reschedule_date ? 'Visit rescheduled' : 'Visit cancelled');
      setShowCancelModal(false);
      setSelectedVisit(null);
      setCancelForm({ cancellation_reason: '', reschedule_date: '', reschedule_time: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    }
  };

  const handleNoShow = async (visitId) => {
    if (!window.confirm('Mark this visitor as no-show?')) return;
    
    try {
      await axios.post(
        `${API_URL}/api/site-visits/${visitId}/no-show`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Marked as no-show');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const VisitCard = ({ visit, showActions = true }) => (
    <div className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800">{visit.visitor_name}</span>
            <Badge className={STATUS_COLORS[visit.status]}>
              {visit.status.replace('_', ' ')}
            </Badge>
            {visit.google_event_id && (
              <Badge className="bg-blue-100 text-blue-800" title="Synced to Google Calendar">
                📅 Calendar
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {visit.visitor_mobile}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(visit.scheduled_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(visit.scheduled_time)}
            </span>
          </div>
        </div>
        {showActions && (
          <div className="flex gap-1">
            {visit.calendar_link && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(visit.calendar_link, '_blank')}
                title="Open in Google Calendar"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
              </Button>
            )}
            {!visit.google_event_id && calendarConnected && !['completed', 'cancelled', 'no_show'].includes(visit.status) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSyncToCalendar(visit.id)}
                title="Sync to Google Calendar"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedVisit(visit); setShowDetailModal(true); }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            Assigned: {visit.assigned_to_name}
          </span>
        </div>
        
        {showActions && visit.status === 'scheduled' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleConfirmVisit(visit.id)}>
              <Check className="w-4 h-4 mr-1" /> Confirm
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600"
              onClick={() => { setSelectedVisit(visit); setShowCancelModal(true); }}
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        )}
        
        {showActions && visit.status === 'confirmed' && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStartVisit(visit.id)}>
              <Play className="w-4 h-4 mr-1" /> Start
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleNoShow(visit.id)}>
              No Show
            </Button>
          </div>
        )}
        
        {showActions && visit.status === 'in_progress' && (
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => { setSelectedVisit(visit); setShowCompleteModal(true); }}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
          </Button>
        )}
        
        {visit.outcome && (
          <Badge className={OUTCOME_COLORS[visit.outcome]}>
            {visit.outcome.replace('_', ' ')}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Site Visits</h1>
              <p className="text-slate-500">Schedule and track property visits</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {calendarConnected ? (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Google Calendar Connected
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1" title="Connect in Settings to sync visits">
                <AlertCircle className="w-3 h-3" />
                Calendar Not Connected
              </Badge>
            )}
            <Button
              onClick={() => setShowScheduleModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Schedule Visit
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <ClickableStatCard 
            title="Today" 
            value={stats.today || 0} 
            icon={Calendar} 
            color="blue"
            onClick={() => setActiveTab('today')}
            className={activeTab === 'today' ? 'ring-2 ring-blue-500' : ''}
          />
          <ClickableStatCard 
            title="Scheduled" 
            value={stats.by_status?.scheduled || 0} 
            icon={Clock} 
            color="cyan"
            onClick={() => setActiveTab('all')}
          />
          <ClickableStatCard 
            title="Confirmed" 
            value={stats.by_status?.confirmed || 0} 
            icon={CheckCircle2} 
            color="purple"
            onClick={() => setActiveTab('all')}
          />
          <ClickableStatCard 
            title="Completed" 
            value={stats.by_status?.completed || 0} 
            icon={Check} 
            color="green"
            onClick={() => setActiveTab('all')}
          />
          <ClickableStatCard 
            title="Conversion" 
            value={`${stats.conversion_rate || 0}%`} 
            icon={TrendingUp} 
            color="orange"
          />
          <ClickableStatCard 
            title="Total" 
            value={stats.total || 0} 
            icon={Users} 
            color="gray"
            onClick={() => setActiveTab('all')}
          />
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="today">Today ({todayVisits.length})</TabsTrigger>
          <TabsTrigger value="all">All Visits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Today's Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-slate-500">Loading...</p>
                </div>
              ) : todayVisits.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No visits scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayVisits.map(visit => (
                    <VisitCard key={visit.id} visit={visit} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="w-48">
                  <label className="text-xs text-slate-500 mb-1 block">Project</label>
                  <select
                    className="w-full border rounded-md p-2 text-sm"
                    value={filters.project_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, project_id: e.target.value }))}
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-40">
                  <label className="text-xs text-slate-500 mb-1 block">Status</label>
                  <select
                    className="w-full border rounded-md p-2 text-sm"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
                <div className="w-40">
                  <label className="text-xs text-slate-500 mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  />
                </div>
                <div className="w-40">
                  <label className="text-xs text-slate-500 mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadVisits} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              {visits.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No visits found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visits.map(visit => (
                    <VisitCard key={visit.id} visit={visit} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Visit Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Schedule Site Visit
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Project */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md p-2"
                value={scheduleForm.project_id}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, project_id: e.target.value }))}
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {/* Visitor Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Visitor Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter name"
                  value={scheduleForm.visitor_name}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, visitor_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter mobile"
                  value={scheduleForm.visitor_mobile}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, visitor_mobile: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="Enter email (optional)"
                value={scheduleForm.visitor_email}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, visitor_email: e.target.value }))}
              />
            </div>
            
            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={scheduleForm.scheduled_date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={scheduleForm.scheduled_time}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Duration</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={scheduleForm.duration_minutes}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                >
                  <option value={30}>30 mins</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            
            {/* Assigned Staff */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md p-2"
                value={scheduleForm.assigned_to}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Select staff...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                ))}
              </select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm h-20 resize-none"
                placeholder="Any notes for the visit..."
                value={scheduleForm.staff_notes}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, staff_notes: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleScheduleVisit} className="bg-blue-600 hover:bg-blue-700">
                Schedule Visit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Visit Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Complete Visit
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisit && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedVisit.visitor_name}</p>
                <p className="text-sm text-slate-500">{selectedVisit.visitor_mobile}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Outcome <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded-md p-2"
                  value={completeForm.outcome}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, outcome: e.target.value }))}
                >
                  <option value="">Select outcome...</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="needs_followup">Needs Follow-up</option>
                  <option value="booking_initiated">Booking Initiated</option>
                  <option value="negotiating">Negotiating</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Visitor Feedback</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm h-16 resize-none"
                  placeholder="What did the visitor say?"
                  value={completeForm.feedback}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, feedback: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Staff Notes</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm h-16 resize-none"
                  placeholder="Internal notes..."
                  value={completeForm.staff_notes}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, staff_notes: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followup"
                  checked={completeForm.followup_required}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, followup_required: e.target.checked }))}
                />
                <label htmlFor="followup" className="text-sm text-slate-700">Follow-up required</label>
              </div>
              
              {completeForm.followup_required && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Follow-up Date</label>
                  <Input
                    type="date"
                    value={completeForm.followup_date}
                    onChange={(e) => setCompleteForm(prev => ({ ...prev, followup_date: e.target.value }))}
                  />
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
                <Button onClick={handleCompleteVisit} className="bg-green-600 hover:bg-green-700">
                  Complete Visit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Visit Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancel / Reschedule Visit
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisit && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedVisit.visitor_name}</p>
                <p className="text-sm text-slate-500">
                  {formatDate(selectedVisit.scheduled_date)} at {formatTime(selectedVisit.scheduled_time)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm h-20 resize-none"
                  placeholder="Why is this visit being cancelled?"
                  value={cancelForm.cancellation_reason}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, cancellation_reason: e.target.value }))}
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Reschedule (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="New date"
                    value={cancelForm.reschedule_date}
                    onChange={(e) => setCancelForm(prev => ({ ...prev, reschedule_date: e.target.value }))}
                  />
                  <Input
                    type="time"
                    placeholder="New time"
                    value={cancelForm.reschedule_time}
                    onChange={(e) => setCancelForm(prev => ({ ...prev, reschedule_time: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCancelModal(false)}>Back</Button>
                <Button 
                  onClick={handleCancelVisit} 
                  className={cancelForm.reschedule_date ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {cancelForm.reschedule_date ? 'Reschedule' : 'Cancel Visit'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visit Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Visit Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{selectedVisit.visitor_name}</p>
                  <p className="text-slate-500">{selectedVisit.visitor_mobile}</p>
                </div>
                <Badge className={STATUS_COLORS[selectedVisit.status]}>
                  {selectedVisit.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium">{formatDate(selectedVisit.scheduled_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium">{formatTime(selectedVisit.scheduled_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-medium">{selectedVisit.duration_minutes} mins</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigned To</p>
                  <p className="font-medium">{selectedVisit.assigned_to_name}</p>
                </div>
              </div>
              
              {selectedVisit.outcome && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">Outcome</p>
                  <Badge className={OUTCOME_COLORS[selectedVisit.outcome]}>
                    {selectedVisit.outcome.replace('_', ' ')}
                  </Badge>
                  {selectedVisit.feedback && (
                    <p className="text-sm text-slate-600 mt-2">
                      <strong>Feedback:</strong> {selectedVisit.feedback}
                    </p>
                  )}
                </div>
              )}
              
              {selectedVisit.staff_notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded">
                    {selectedVisit.staff_notes}
                  </p>
                </div>
              )}
              
              {selectedVisit.followup_required && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Follow-up required
                    {selectedVisit.followup_date && ` on ${formatDate(selectedVisit.followup_date)}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteVisits;
