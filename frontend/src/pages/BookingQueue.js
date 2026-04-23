/**
 * Booking Queue Management
 * - Waitlist for booked/blocked properties
 * - Queue management when properties become available
 * - Notify customers, record responses
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, UserPlus, Bell, Check, X, ChevronUp, Trash2,
  Clock, Phone, Mail, Building, Eye, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  waiting: 'bg-blue-100 text-blue-800',
  notified: 'bg-blue-100 text-blue-800',
  converted: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  skipped: 'bg-orange-100 text-orange-800'
};

const BookingQueue = () => {
  const { user } = useAuth();
  
  // State
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // Form
  const [addForm, setAddForm] = useState({
    project_id: '',
    property_id: '',
    customer_name: '',
    customer_mobile: '',
    customer_email: '',
    max_price: '',
    notes: '',
    priority: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    project_id: '',
    status: ''
  });
  
  // Response
  const [responseData, setResponseData] = useState({
    response: '',
    notes: ''
  });

  const isAdmin = user?.role === 'super_admin' || user?.role === 'tenant_admin';

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadEntries(), loadStats(), loadProjects()]);
    setLoading(false);
  };

  const loadEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.project_id) params.append('project_id', filters.project_id);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(`${API_URL}/api/booking-queue?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setEntries(response.data.entries);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/booking-queue/stats`, {
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

  const handleAddToQueue = async () => {
    if (!addForm.project_id || !addForm.property_id || 
        !addForm.customer_name || !addForm.customer_mobile) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/booking-queue`,
        {
          ...addForm,
          max_price: addForm.max_price ? parseFloat(addForm.max_price) : null
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAddModal(false);
        resetAddForm();
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to queue');
    }
  };

  const resetAddForm = () => {
    setAddForm({
      project_id: '',
      property_id: '',
      customer_name: '',
      customer_mobile: '',
      customer_email: '',
      max_price: '',
      notes: '',
      priority: 0
    });
  };

  const handleNotify = async () => {
    if (!selectedEntry) return;
    
    try {
      const response = await axios.post(
        `${API_URL}/api/booking-queue/${selectedEntry.id}/notify`,
        { response_hours: 48 },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowNotifyModal(false);
        setSelectedEntry(null);
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to notify');
    }
  };

  const handleResponse = async () => {
    if (!selectedEntry || !responseData.response) {
      toast.error('Please select a response');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/booking-queue/${selectedEntry.id}/respond`,
        responseData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowResponseModal(false);
        setSelectedEntry(null);
        setResponseData({ response: '', notes: '' });
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record response');
    }
  };

  const handleMoveUp = async (entryId) => {
    try {
      await axios.post(
        `${API_URL}/api/booking-queue/${entryId}/move-up`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Moved up');
      loadEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  const handleCancel = async (entryId) => {
    if (!window.confirm('Cancel this queue entry?')) return;
    
    try {
      await axios.post(
        `${API_URL}/api/booking-queue/${entryId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Entry cancelled');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this entry permanently?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/booking-queue/${entryId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Entry deleted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  // Group entries by property
  const groupedEntries = entries.reduce((acc, entry) => {
    const key = entry.property_id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Booking Queue</h1>
              <p className="text-slate-500">Manage waitlists for properties</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <UserPlus className="w-4 h-4" />
            Add to Queue
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600">Waiting</p>
              <p className="text-2xl font-bold text-blue-800">{stats.by_status?.waiting || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600">Notified</p>
              <p className="text-2xl font-bold text-blue-800">{stats.by_status?.notified || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-600">Converted</p>
              <p className="text-2xl font-bold text-green-800">{stats.by_status?.converted || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <p className="text-sm text-orange-600">Conversion</p>
              <p className="text-2xl font-bold text-orange-800">{stats.conversion_rate || 0}%</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Properties</p>
              <p className="text-2xl font-bold text-slate-800">{stats.properties_with_queue || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
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
                <option value="waiting">Waiting</option>
                <option value="notified">Notified</option>
                <option value="converted">Converted</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Queue Entries ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No queue entries</p>
              <p className="text-sm text-slate-400">Add customers to waitlists for properties</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEntries).map(([propertyId, propertyEntries]) => (
                <div key={propertyId} className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-100 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-800">
                        Property: {propertyId.substring(0, 8)}...
                      </span>
                      <Badge variant="outline">{propertyEntries.length} in queue</Badge>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {propertyEntries.sort((a, b) => a.position - b.position).map(entry => (
                      <div key={entry.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                            {entry.position}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{entry.customer_name}</p>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {entry.customer_mobile}
                              </span>
                              {entry.max_price && (
                                <span>Budget: ₹{(entry.max_price / 100000).toFixed(1)}L</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[entry.status]}>
                            {entry.status}
                          </Badge>
                          
                          {entry.status === 'waiting' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedEntry(entry); setShowNotifyModal(true); }}
                                title="Notify customer"
                              >
                                <Bell className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveUp(entry.id)}
                                  title="Move up"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                          
                          {entry.status === 'notified' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedEntry(entry); setShowResponseModal(true); }}
                            >
                              Record Response
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => entry.status === 'waiting' ? handleCancel(entry.id) : handleDelete(entry.id)}
                          >
                            {entry.status === 'waiting' ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Queue Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Add to Queue
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded-md p-2"
                value={addForm.project_id}
                onChange={(e) => setAddForm(prev => ({ ...prev, project_id: e.target.value }))}
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Property/Plot ID <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter property ID"
                value={addForm.property_id}
                onChange={(e) => setAddForm(prev => ({ ...prev, property_id: e.target.value }))}
              />
              <p className="text-xs text-slate-400 mt-1">Enter the plot or property ID they want</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Name"
                  value={addForm.customer_name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, customer_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Mobile"
                  value={addForm.customer_mobile}
                  onChange={(e) => setAddForm(prev => ({ ...prev, customer_mobile: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Max Budget (₹)</label>
              <Input
                type="number"
                placeholder="Optional"
                value={addForm.max_price}
                onChange={(e) => setAddForm(prev => ({ ...prev, max_price: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
              <textarea
                className="w-full border rounded-md p-2 text-sm h-16 resize-none"
                placeholder="Any notes..."
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowAddModal(false); resetAddForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddToQueue} className="bg-purple-600 hover:bg-purple-700">
                Add to Queue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notify Modal */}
      <Dialog open={showNotifyModal} onOpenChange={setShowNotifyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Notify Customer
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedEntry.customer_name}</p>
                <p className="text-sm text-slate-500">{selectedEntry.customer_mobile}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Position #{selectedEntry.position} in queue
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Customer will be notified that the property is available.
                  They will have <strong>48 hours</strong> to respond.
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowNotifyModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleNotify} className="bg-blue-600 hover:bg-blue-700">
                  <Bell className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Record Response
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedEntry.customer_name}</p>
                <p className="text-sm text-slate-500">{selectedEntry.customer_mobile}</p>
                {selectedEntry.response_deadline && (
                  <p className="text-xs text-orange-600 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Deadline: {new Date(selectedEntry.response_deadline).toLocaleString()}
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Customer Response <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <Button
                    variant={responseData.response === 'interested' ? 'default' : 'outline'}
                    className={responseData.response === 'interested' ? 'bg-green-600' : ''}
                    onClick={() => setResponseData(prev => ({ ...prev, response: 'interested' }))}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Interested
                  </Button>
                  <Button
                    variant={responseData.response === 'not_interested' ? 'default' : 'outline'}
                    className={responseData.response === 'not_interested' ? 'bg-red-600' : ''}
                    onClick={() => setResponseData(prev => ({ ...prev, response: 'not_interested' }))}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Not Interested
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm h-16 resize-none"
                  placeholder="Any additional notes..."
                  value={responseData.notes}
                  onChange={(e) => setResponseData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowResponseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResponse} 
                  disabled={!responseData.response}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Save Response
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingQueue;
