/**
 * Complaint Management System
 * - Register and track customer complaints
 * - Assignment and escalation
 * - Resolution and feedback
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle, MessageSquare, CheckCircle, Clock, AlertTriangle,
  RefreshCw, Plus, Eye, UserPlus, TrendingUp, ArrowLeft,
  Phone, Mail, Search, XCircle, Star, Send, ArrowUpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  reopened: 'bg-orange-100 text-orange-800'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const CATEGORIES = [
  { value: 'construction', label: 'Construction' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'payment', label: 'Payment' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'quality', label: 'Quality' },
  { value: 'staff_behavior', label: 'Staff Behavior' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_customer', label: 'Pending Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' }
];

const ComplaintManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintDetails, setComplaintDetails] = useState(null);
  
  // Form state
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    category: 'other',
    subject: '',
    description: '',
    priority: 'medium'
  });
  
  const [assignTo, setAssignTo] = useState('');
  const [escalateForm, setEscalateForm] = useState({ escalate_to: '', reason: '' });
  const [resolution, setResolution] = useState('');
  const [commentForm, setCommentForm] = useState({ comment: '', is_internal: false, status_change: '' });
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, feedback: '' });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/complaints/stats/summary`, { headers });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [token]);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/complaints?limit=100`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'all') url += `&priority=${priorityFilter}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, categoryFilter, statusFilter, priorityFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    fetchComplaints();
    fetchUsers();
  }, [fetchStats, fetchComplaints, fetchUsers]);

  // Create Complaint
  const handleCreateComplaint = async () => {
    if (!createForm.customer_name || !createForm.customer_phone || !createForm.subject || !createForm.description) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Complaint registered: ${data.complaint_number}`);
        setShowCreateDialog(false);
        resetCreateForm();
        fetchComplaints();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to create complaint');
      }
    } catch (err) {
      toast.error('Error creating complaint');
    } finally {
      setLoading(false);
    }
  };

  // View Complaint Details
  const handleViewComplaint = async (complaint) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/${complaint.id}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setComplaintDetails(data);
        setSelectedComplaint(complaint);
        setShowDetailDialog(true);
      }
    } catch (err) {
      toast.error('Error fetching complaint details');
    } finally {
      setLoading(false);
    }
  };

  // Assign Complaint
  const handleAssign = async () => {
    if (!assignTo) {
      toast.error('Please select a staff member');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/assign?complaint_id=${selectedComplaint.id}&assign_to=${assignTo}`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowAssignDialog(false);
        setAssignTo('');
        fetchComplaints();
        if (showDetailDialog) handleViewComplaint(selectedComplaint);
      } else {
        toast.error(data.detail || 'Failed to assign');
      }
    } catch (err) {
      toast.error('Error assigning complaint');
    } finally {
      setLoading(false);
    }
  };

  // Escalate Complaint
  const handleEscalate = async () => {
    if (!escalateForm.escalate_to || !escalateForm.reason) {
      toast.error('Please fill all fields');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/escalate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          ...escalateForm
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowEscalateDialog(false);
        setEscalateForm({ escalate_to: '', reason: '' });
        fetchComplaints();
        if (showDetailDialog) handleViewComplaint(selectedComplaint);
      } else {
        toast.error(data.detail || 'Failed to escalate');
      }
    } catch (err) {
      toast.error('Error escalating complaint');
    } finally {
      setLoading(false);
    }
  };

  // Resolve Complaint
  const handleResolve = async () => {
    if (!resolution) {
      toast.error('Please enter resolution details');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          resolution
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Complaint resolved');
        setShowResolveDialog(false);
        setResolution('');
        fetchComplaints();
        fetchStats();
        if (showDetailDialog) handleViewComplaint(selectedComplaint);
      } else {
        toast.error(data.detail || 'Failed to resolve');
      }
    } catch (err) {
      toast.error('Error resolving complaint');
    } finally {
      setLoading(false);
    }
  };

  // Close Complaint
  const handleClose = async (complaint) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/${complaint.id}/close`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Complaint closed');
        fetchComplaints();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to close');
      }
    } catch (err) {
      toast.error('Error closing complaint');
    } finally {
      setLoading(false);
    }
  };

  // Reopen Complaint
  const handleReopen = async (complaint) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/${complaint.id}/reopen`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Complaint reopened');
        fetchComplaints();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to reopen');
      }
    } catch (err) {
      toast.error('Error reopening complaint');
    } finally {
      setLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!commentForm.comment) {
      toast.error('Please enter a comment');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/comments/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          comment: commentForm.comment,
          is_internal: commentForm.is_internal,
          status_change: commentForm.status_change || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Comment added');
        setShowCommentDialog(false);
        setCommentForm({ comment: '', is_internal: false, status_change: '' });
        if (showDetailDialog) handleViewComplaint(selectedComplaint);
        fetchComplaints();
      } else {
        toast.error(data.detail || 'Failed to add comment');
      }
    } catch (err) {
      toast.error('Error adding comment');
    } finally {
      setLoading(false);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/complaints/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          satisfaction_rating: feedbackForm.rating,
          feedback: feedbackForm.feedback
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Feedback submitted');
        setShowFeedbackDialog(false);
        setFeedbackForm({ rating: 5, feedback: '' });
        if (showDetailDialog) handleViewComplaint(selectedComplaint);
      } else {
        toast.error(data.detail || 'Failed to submit feedback');
      }
    } catch (err) {
      toast.error('Error submitting feedback');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetCreateForm = () => {
    setCreateForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      category: 'other',
      subject: '',
      description: '',
      priority: 'medium'
    });
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Get filtered complaints by tab
  const getFilteredComplaints = () => {
    if (activeTab === 'all') return complaints;
    if (activeTab === 'open') return complaints.filter(c => ['open', 'acknowledged', 'in_progress', 'pending_customer', 'reopened'].includes(c.status));
    if (activeTab === 'resolved') return complaints.filter(c => c.status === 'resolved');
    if (activeTab === 'sla_breached') return complaints.filter(c => c.sla_breached);
    if (activeTab === 'escalated') return complaints.filter(c => c.is_escalated);
    return complaints;
  };

  const filteredComplaints = getFilteredComplaints();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="complaint-management-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-7 h-7 text-red-600" />
                Complaint Management
              </h1>
              <p className="text-gray-500 mt-1">Track and resolve customer complaints</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchStats(); fetchComplaints(); }} disabled={loading} data-testid="refresh-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true); }} data-testid="new-complaint-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Complaint
            </Button>
          </div>
        </div>

        {/* Stats - Clickable Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <ClickableStatCard 
              title="Total" 
              value={stats.total} 
              icon={MessageSquare} 
              color="blue"
              onClick={() => setActiveTab('all')}
              className={activeTab === 'all' ? 'ring-2 ring-blue-500' : ''}
            />
            <ClickableStatCard 
              title="Open" 
              value={stats.open} 
              icon={Clock} 
              color="yellow"
              onClick={() => setActiveTab('open')}
              className={activeTab === 'open' ? 'ring-2 ring-yellow-500' : ''}
            />
            <ClickableStatCard 
              title="Resolved" 
              value={stats.by_status?.resolved || 0} 
              icon={CheckCircle} 
              color="green"
              onClick={() => setActiveTab('resolved')}
              className={activeTab === 'resolved' ? 'ring-2 ring-green-500' : ''}
            />
            <ClickableStatCard 
              title="SLA Breached" 
              value={stats.sla_breached} 
              icon={AlertTriangle} 
              color="red"
              onClick={() => setActiveTab('sla_breached')}
              className={activeTab === 'sla_breached' ? 'ring-2 ring-red-500' : ''}
            />
            <ClickableStatCard 
              title="Escalated" 
              value={stats.escalated} 
              icon={ArrowUpCircle} 
              color="orange"
              onClick={() => setActiveTab('escalated')}
              className={activeTab === 'escalated' ? 'ring-2 ring-orange-500' : ''}
            />
            <ClickableStatCard 
              title="Avg Rating" 
              value={stats.avg_satisfaction || '-'} 
              icon={Star} 
              color="purple"
            />
          </div>
        )}

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All ({complaints.length})</TabsTrigger>
              <TabsTrigger value="open" data-testid="tab-open">Open</TabsTrigger>
              <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved</TabsTrigger>
              <TabsTrigger value="sla_breached" data-testid="tab-sla">SLA Breached</TabsTrigger>
              <TabsTrigger value="escalated" data-testid="tab-escalated">Escalated</TabsTrigger>
            </TabsList>
          </div>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-sm">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, phone, complaint#..."
                      className="pl-10"
                      data-testid="search-input"
                    />
                  </div>
                </div>
                <div className="w-40">
                  <Label className="text-sm">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="category-filter">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Label className="text-sm">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="status-filter">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Label className="text-sm">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger data-testid="priority-filter">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complaints List */}
          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filteredComplaints.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No complaints found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredComplaints.map((complaint) => (
                      <div key={complaint.id} className="p-4 hover:bg-gray-50" data-testid={`complaint-item-${complaint.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm text-blue-600">{complaint.complaint_number}</span>
                              <Badge className={STATUS_COLORS[complaint.status]}>{complaint.status?.replace('_', ' ')}</Badge>
                              <Badge className={PRIORITY_COLORS[complaint.priority]}>{complaint.priority}</Badge>
                              <Badge variant="outline">{complaint.category?.replace('_', ' ')}</Badge>
                              {complaint.sla_breached && <Badge className="bg-red-600 text-white">SLA Breached</Badge>}
                              {complaint.is_escalated && <Badge className="bg-orange-600 text-white">Escalated</Badge>}
                            </div>
                            <p className="font-medium">{complaint.subject}</p>
                            <div className="flex gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{complaint.customer_name} - {complaint.customer_phone}</span>
                              {complaint.customer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{complaint.customer_email}</span>}
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                              <span>Created: {formatDate(complaint.created_at)}</span>
                              {complaint.sla_due_date && <span>SLA Due: {formatDate(complaint.sla_due_date)}</span>}
                              {complaint.satisfaction_rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500" />{complaint.satisfaction_rating}/5
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" variant="outline" onClick={() => handleViewComplaint(complaint)} data-testid={`view-btn-${complaint.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!['resolved', 'closed'].includes(complaint.status) && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedComplaint(complaint); setShowAssignDialog(true); }} data-testid={`assign-btn-${complaint.id}`}>
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedComplaint(complaint); setShowResolveDialog(true); }} data-testid={`resolve-btn-${complaint.id}`}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {complaint.status === 'resolved' && (
                              <Button size="sm" variant="outline" onClick={() => handleClose(complaint)} data-testid={`close-btn-${complaint.id}`}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {['resolved', 'closed'].includes(complaint.status) && (
                              <Button size="sm" variant="outline" onClick={() => handleReopen(complaint)} data-testid={`reopen-btn-${complaint.id}`}>
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
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

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Complaint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input value={createForm.customer_name} onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })} data-testid="customer-name-input" />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={createForm.customer_phone} onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })} data-testid="customer-phone-input" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={createForm.customer_email} onChange={(e) => setCreateForm({ ...createForm, customer_email: e.target.value })} type="email" data-testid="customer-email-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}>
                    <SelectTrigger data-testid="priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Subject *</Label>
                <Input value={createForm.subject} onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })} data-testid="subject-input" />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={4} data-testid="description-input" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateComplaint} disabled={loading} data-testid="submit-complaint-btn">
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complaint Details</DialogTitle>
            </DialogHeader>
            {complaintDetails && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-lg text-blue-600">{complaintDetails.complaint.complaint_number}</p>
                    <p className="text-xl font-medium mt-1">{complaintDetails.complaint.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={STATUS_COLORS[complaintDetails.complaint.status]}>{complaintDetails.complaint.status?.replace('_', ' ')}</Badge>
                    <Badge className={PRIORITY_COLORS[complaintDetails.complaint.priority]}>{complaintDetails.complaint.priority}</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-gray-500">Customer</Label>
                    <p className="font-medium">{complaintDetails.complaint.customer_name}</p>
                    <p className="text-sm">{complaintDetails.complaint.customer_phone}</p>
                    {complaintDetails.complaint.customer_email && <p className="text-sm">{complaintDetails.complaint.customer_email}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-500">Category</Label>
                    <p>{complaintDetails.complaint.category?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Created</Label>
                    <p>{formatDate(complaintDetails.complaint.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">SLA Due</Label>
                    <p className={complaintDetails.complaint.sla_breached ? 'text-red-600 font-medium' : ''}>
                      {formatDate(complaintDetails.complaint.sla_due_date)}
                      {complaintDetails.complaint.sla_breached && ' (BREACHED)'}
                    </p>
                  </div>
                  {complaintDetails.assigned_user && (
                    <div>
                      <Label className="text-gray-500">Assigned To</Label>
                      <p>{complaintDetails.assigned_user.name}</p>
                      <p className="text-sm text-gray-500">{complaintDetails.assigned_user.email}</p>
                    </div>
                  )}
                  {complaintDetails.complaint.resolution && (
                    <div className="col-span-2">
                      <Label className="text-gray-500">Resolution</Label>
                      <p className="text-green-700">{complaintDetails.complaint.resolution}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-500">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{complaintDetails.complaint.description}</p>
                </div>

                {/* Comments */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-gray-500">Activity Log</Label>
                    <Button size="sm" variant="outline" onClick={() => setShowCommentDialog(true)}>
                      <Send className="w-4 h-4 mr-1" />Add Comment
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {complaintDetails.comments?.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded-lg ${comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{comment.user_name}</span>
                          <span className="text-gray-500">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.comment}</p>
                        {comment.status_changed_to && (
                          <Badge variant="outline" className="mt-1">Status: {comment.status_changed_to}</Badge>
                        )}
                        {comment.is_internal && <Badge className="mt-1 bg-yellow-200 text-yellow-800">Internal Note</Badge>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {!['resolved', 'closed'].includes(complaintDetails.complaint.status) && (
                    <>
                      <Button size="sm" onClick={() => setShowAssignDialog(true)}>
                        <UserPlus className="w-4 h-4 mr-1" />Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowEscalateDialog(true)}>
                        <ArrowUpCircle className="w-4 h-4 mr-1" />Escalate
                      </Button>
                      <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setShowResolveDialog(true)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Resolve
                      </Button>
                    </>
                  )}
                  {complaintDetails.complaint.status === 'resolved' && (
                    <>
                      <Button size="sm" onClick={() => handleClose(complaintDetails.complaint)}>
                        <XCircle className="w-4 h-4 mr-1" />Close
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowFeedbackDialog(true)}>
                        <Star className="w-4 h-4 mr-1" />Add Feedback
                      </Button>
                    </>
                  )}
                  {['resolved', 'closed'].includes(complaintDetails.complaint.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleReopen(complaintDetails.complaint)}>
                      <RefreshCw className="w-4 h-4 mr-1" />Reopen
                    </Button>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Complaint</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Assign To *</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger data-testid="assign-select">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'customer').map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={loading} data-testid="confirm-assign-btn">
                {loading ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate Dialog */}
        <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escalate Complaint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Escalate To *</Label>
                <Select value={escalateForm.escalate_to} onValueChange={(v) => setEscalateForm({ ...escalateForm, escalate_to: v })}>
                  <SelectTrigger data-testid="escalate-select">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => ['admin', 'manager', 'tenant_admin'].includes(u.role)).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason *</Label>
                <Textarea value={escalateForm.reason} onChange={(e) => setEscalateForm({ ...escalateForm, reason: e.target.value })} rows={3} data-testid="escalate-reason-input" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>Cancel</Button>
              <Button onClick={handleEscalate} disabled={loading} className="bg-orange-600 hover:bg-orange-700" data-testid="confirm-escalate-btn">
                {loading ? 'Escalating...' : 'Escalate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resolve Complaint</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Resolution Details *</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} placeholder="Describe how the issue was resolved..." data-testid="resolution-input" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
              <Button onClick={handleResolve} disabled={loading} className="bg-green-600 hover:bg-green-700" data-testid="confirm-resolve-btn">
                {loading ? 'Resolving...' : 'Mark Resolved'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Comment Dialog */}
        <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Comment *</Label>
                <Textarea value={commentForm.comment} onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })} rows={3} data-testid="comment-input" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal"
                  checked={commentForm.is_internal}
                  onChange={(e) => setCommentForm({ ...commentForm, is_internal: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="internal" className="text-sm cursor-pointer">Internal note (not visible to customer)</Label>
              </div>
              <div>
                <Label>Change Status (optional)</Label>
                <Select value={commentForm.status_change} onValueChange={(v) => setCommentForm({ ...commentForm, status_change: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No change</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCommentDialog(false)}>Cancel</Button>
              <Button onClick={handleAddComment} disabled={loading} data-testid="submit-comment-btn">
                {loading ? 'Adding...' : 'Add Comment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Customer Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Satisfaction Rating *</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      size="sm"
                      variant={feedbackForm.rating === rating ? 'default' : 'outline'}
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating })}
                      className={feedbackForm.rating === rating ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      <Star className={`w-4 h-4 ${feedbackForm.rating >= rating ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Feedback Comments</Label>
                <Textarea value={feedbackForm.feedback} onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })} rows={3} placeholder="Optional feedback from customer..." data-testid="feedback-input" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmitFeedback} disabled={loading} data-testid="submit-feedback-btn">
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ComplaintManagement;
