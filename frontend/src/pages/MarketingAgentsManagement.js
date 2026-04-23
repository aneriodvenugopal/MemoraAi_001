import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Filter, Eye, Edit, Trash2, X, Phone, Mail,
  DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle, Building,
  CreditCard, ChevronRight, Calendar, RefreshCw, Download, UserPlus,
  ToggleLeft, ToggleRight, Banknote, FileText, IndianRupee
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MarketingAgentsManagement = () => {
  // State
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentSales, setAgentSales] = useState([]);
  const [agentPayments, setAgentPayments] = useState([]);
  const [salesByProject, setSalesByProject] = useState([]);
  const [detailTab, setDetailTab] = useState('overview');
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    commission_rate: 2.5,
    address: '',
    notes: '',
    bank_details: {
      account_number: '',
      bank_name: '',
      ifsc_code: '',
      upi_id: ''
    }
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'upi',
    reference_no: '',
    bank_account_id: '',
    notes: ''
  });

  // Fetch data
  const fetchAgents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/marketing-agents/?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    }
  }, [statusFilter, search]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/marketing-agents/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data.projects || data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/bank-accounts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBankAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchAgentDetails = async (agentId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch sales
      const salesRes = await fetch(`${API_URL}/api/marketing-agents/${agentId}/sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const salesData = await salesRes.json();
      setAgentSales(salesData.sales || []);
      
      // Fetch payments
      const paymentsRes = await fetch(`${API_URL}/api/marketing-agents/${agentId}/payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paymentsData = await paymentsRes.json();
      setAgentPayments(paymentsData.payments || []);
      
      // Fetch sales by project
      const projectRes = await fetch(`${API_URL}/api/marketing-agents/${agentId}/sales/by-project`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const projectData = await projectRes.json();
      setSalesByProject(projectData.projects || []);
      
    } catch (error) {
      console.error('Error fetching agent details:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAgents(), fetchStats(), fetchProjects(), fetchBankAccounts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAgents]);

  // Handlers
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/marketing-agents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Agent created successfully');
        setShowAddModal(false);
        resetForm();
        fetchAgents();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to create agent');
      }
    } catch (error) {
      toast.error('Failed to create agent');
    }
  };

  const handleUpdateStatus = async (agentId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/marketing-agents/${agentId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success(`Agent status updated to ${newStatus}`);
        fetchAgents();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/marketing-agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Agent deleted');
        fetchAgents();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/marketing-agents/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          ...paymentForm,
          amount: parseFloat(paymentForm.amount)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Payment recorded. Receipt: ${data.receipt_number}`);
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', payment_mode: 'upi', reference_no: '', bank_account_id: '', notes: '' });
        fetchAgentDetails(selectedAgent.id);
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const openDetailModal = async (agent) => {
    setSelectedAgent(agent);
    setDetailTab('overview');
    setShowDetailModal(true);
    await fetchAgentDetails(agent.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      commission_rate: 2.5,
      address: '',
      notes: '',
      bank_details: { account_number: '', bank_name: '', ifsc_code: '', upi_id: '' }
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Marketing Agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Marketing Agents
            </h1>
            <p className="text-gray-600 mt-1">Manage agents, track commissions & payments</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Agents</p>
                    <p className="text-3xl font-bold">{stats.total_agents}</p>
                    <p className="text-xs text-blue-200">{stats.active_agents} active</p>
                  </div>
                  <Users className="w-10 h-10 opacity-30" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Commission</p>
                    <p className="text-3xl font-bold">{formatCurrency(stats.total_commission)}</p>
                    <p className="text-xs text-green-200">Paid: {formatCurrency(stats.total_paid)}</p>
                  </div>
                  <DollarSign className="w-10 h-10 opacity-30" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Commission Due</p>
                    <p className="text-3xl font-bold">{formatCurrency(stats.commission_due)}</p>
                    <p className="text-xs text-orange-200">Pending payout</p>
                  </div>
                  <AlertCircle className="w-10 h-10 opacity-30" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">This Month Sales</p>
                    <p className="text-3xl font-bold">{formatCurrency(stats.this_month?.sales)}</p>
                    <p className="text-xs text-purple-200">{stats.this_month?.bookings || 0} bookings</p>
                  </div>
                  <TrendingUp className="w-10 h-10 opacity-30" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { fetchAgents(); fetchStats(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card 
              key={agent.id} 
              className="hover:shadow-lg transition-all border-2 hover:border-blue-200 cursor-pointer"
              onClick={() => openDetailModal(agent)}
            >
              <CardContent className="p-5">
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.phone}</p>
                    </div>
                  </div>
                  <Badge className={`${
                    agent.status === 'active' ? 'bg-green-100 text-green-700' :
                    agent.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {agent.status}
                  </Badge>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Bookings</p>
                    <p className="font-bold text-blue-600">{agent.stats?.booking_count || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="font-bold text-green-600">{formatCurrency(agent.stats?.total_commission)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Due</p>
                    <p className="font-bold text-orange-600">{formatCurrency(agent.stats?.balance_due)}</p>
                  </div>
                </div>

                {/* Commission Summary */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Earned:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(agent.stats?.total_commission)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold">{formatCurrency(agent.stats?.total_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(agent.stats?.balance_due)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => openDetailModal(agent)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUpdateStatus(agent.id, agent.status === 'active' ? 'inactive' : 'active')}
                  >
                    {agent.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {agents.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Agents Found</h3>
              <p className="text-gray-500 mb-4">Add your first marketing agent to get started</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Agent Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Add Marketing Agent
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAgent}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Agent name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="agent@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Commission Rate (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value)})}
                    placeholder="2.5"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Address"
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Account Number</label>
                    <Input
                      value={formData.bank_details.account_number}
                      onChange={(e) => setFormData({
                        ...formData, 
                        bank_details: {...formData.bank_details, account_number: e.target.value}
                      })}
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Bank Name</label>
                    <Input
                      value={formData.bank_details.bank_name}
                      onChange={(e) => setFormData({
                        ...formData, 
                        bank_details: {...formData.bank_details, bank_name: e.target.value}
                      })}
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">IFSC Code</label>
                    <Input
                      value={formData.bank_details.ifsc_code}
                      onChange={(e) => setFormData({
                        ...formData, 
                        bank_details: {...formData.bank_details, ifsc_code: e.target.value}
                      })}
                      placeholder="IFSC code"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">UPI ID</label>
                    <Input
                      value={formData.bank_details.upi_id}
                      onChange={(e) => setFormData({
                        ...formData, 
                        bank_details: {...formData.bank_details, upi_id: e.target.value}
                      })}
                      placeholder="upi@bank"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Agent Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {selectedAgent.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedAgent.name}</h2>
                      <p className="text-sm text-gray-500">{selectedAgent.phone}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => { setShowPaymentModal(true); }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Pay Commission
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sales">Properties Sold</TabsTrigger>
                  <TabsTrigger value="payments">Payment History</TabsTrigger>
                  <TabsTrigger value="by-project">By Project</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-green-700">Total Earned</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedAgent.stats?.total_commission)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-blue-700">Paid</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(selectedAgent.stats?.total_paid)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-orange-700">Balance Due</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(selectedAgent.stats?.balance_due)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Agent Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 font-medium">{selectedAgent.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 font-medium">{selectedAgent.email || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Commission Rate:</span>
                          <span className="ml-2 font-medium">{selectedAgent.commission_rate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Bookings:</span>
                          <span className="ml-2 font-medium">{selectedAgent.stats?.booking_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Joining Date:</span>
                          <span className="ml-2 font-medium">{formatDate(selectedAgent.joining_date)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <Badge className="ml-2">{selectedAgent.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="mt-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Project</th>
                          <th className="text-left p-3 text-sm font-semibold">Property</th>
                          <th className="text-right p-3 text-sm font-semibold">Sale Amount</th>
                          <th className="text-right p-3 text-sm font-semibold">Commission</th>
                          <th className="text-center p-3 text-sm font-semibold">Status</th>
                          <th className="text-center p-3 text-sm font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentSales.map((sale, idx) => (
                          <tr key={sale.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-3">{sale.project_name || '-'}</td>
                            <td className="p-3 font-medium">{sale.property_number || '-'}</td>
                            <td className="p-3 text-right">{formatCurrency(sale.sale_amount)}</td>
                            <td className="p-3 text-right font-medium text-green-600">
                              {formatCurrency(sale.commission_amount)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={`${
                                sale.status === 'paid' ? 'bg-green-100 text-green-700' :
                                sale.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {sale.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-sm text-gray-500">
                              {formatDate(sale.created_at)}
                            </td>
                          </tr>
                        ))}
                        {agentSales.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-gray-500">
                              No sales recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {agentSales.length > 0 && (
                        <tfoot className="bg-gray-100 font-semibold">
                          <tr>
                            <td colSpan="2" className="p-3">Total</td>
                            <td className="p-3 text-right">
                              {formatCurrency(agentSales.reduce((sum, s) => sum + (s.sale_amount || 0), 0))}
                            </td>
                            <td className="p-3 text-right text-green-600">
                              {formatCurrency(agentSales.reduce((sum, s) => sum + (s.commission_amount || 0), 0))}
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Date</th>
                          <th className="text-right p-3 text-sm font-semibold">Amount</th>
                          <th className="text-center p-3 text-sm font-semibold">Mode</th>
                          <th className="text-left p-3 text-sm font-semibold">Property</th>
                          <th className="text-left p-3 text-sm font-semibold">Reference</th>
                          <th className="text-left p-3 text-sm font-semibold">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentPayments.map((payment, idx) => (
                          <tr key={payment.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-3">{formatDate(payment.payment_date)}</td>
                            <td className="p-3 text-right font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">{payment.payment_mode?.toUpperCase()}</Badge>
                            </td>
                            <td className="p-3">{payment.property_number || '-'}</td>
                            <td className="p-3 text-sm text-gray-500">{payment.reference_no || '-'}</td>
                            <td className="p-3 font-mono text-sm">{payment.receipt_number}</td>
                          </tr>
                        ))}
                        {agentPayments.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-gray-500">
                              No payments recorded yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* By Project Tab */}
                <TabsContent value="by-project" className="mt-4 space-y-4">
                  {salesByProject.map((project) => (
                    <Card key={project.project_id} className="border-2">
                      <CardHeader className="bg-gray-50 py-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            {project.project_name}
                          </CardTitle>
                          <div className="text-sm">
                            <span className="text-gray-500">Commission:</span>
                            <span className="ml-2 font-bold text-green-600">
                              {formatCurrency(project.total_commission)}
                            </span>
                            <span className="mx-2">|</span>
                            <span className="text-gray-500">Paid:</span>
                            <span className="ml-2 font-semibold">
                              {formatCurrency(project.total_paid)}
                            </span>
                            <span className="mx-2">|</span>
                            <span className="text-gray-500">Due:</span>
                            <span className="ml-2 font-semibold text-orange-600">
                              {formatCurrency(project.balance_due)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <table className="w-full">
                          <tbody>
                            {project.sales?.map((sale, idx) => (
                              <tr key={sale.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-3 font-medium">{sale.property_number || 'Property'}</td>
                                <td className="p-3">{formatCurrency(sale.sale_amount)}</td>
                                <td className="p-3 text-green-600">{formatCurrency(sale.commission_amount)}</td>
                                <td className="p-3">
                                  <Badge className={sale.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                                    {sale.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {salesByProject.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Building className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No project-wise sales data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              Pay Commission to {selectedAgent?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment}>
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-700">
                  Balance Due: <span className="font-bold">{formatCurrency(selectedAgent?.stats?.balance_due)}</span>
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  placeholder="Enter amount"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Payment Mode *</label>
                <Select 
                  value={paymentForm.payment_mode} 
                  onValueChange={(v) => setPaymentForm({...paymentForm, payment_mode: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">From Bank Account</label>
                <Select 
                  value={paymentForm.bank_account_id} 
                  onValueChange={(v) => setPaymentForm({...paymentForm, bank_account_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_number?.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Reference No.</label>
                <Input
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                  placeholder="Transaction ID / Cheque No."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingAgentsManagement;
