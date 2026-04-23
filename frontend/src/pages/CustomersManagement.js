/**
 * Customers Management
 * - CRUD operations on customers
 * - Search by name, phone, email
 * - View purchase history
 * - Manage wallet and tags
 * - Indian Real Estate specific fields (Aadhar, PAN, NRI, Joint Buyers)
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, UserPlus, Search, Phone, Mail, MapPin, Eye, Edit2,
  Trash2, Tag, Wallet, History, RefreshCw, Globe, IndianRupee,
  Building, FileText, Plus, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  blacklisted: 'bg-red-100 text-red-800'
};

const CustomersManagement = () => {
  const { user } = useAuth();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhar_number: '',
    pan_number: '',
    is_nri: false,
    passport_number: '',
    country_of_residence: '',
    is_joint_buyer: false,
    preferred_contact_method: 'phone',
    preferred_contact_time: '',
    notes: '',
    tags: ''
  });
  
  // Purchase history
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  
  // Wallet
  const [walletData, setWalletData] = useState(null);
  const [walletAction, setWalletAction] = useState({ type: 'credit', amount: '', reason: '', description: '' });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    is_nri: ''
  });

  const isAdmin = user?.role === 'super_admin' || user?.role === 'tenant_admin';

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCustomers(), loadStats()]);
    setLoading(false);
  };

  const loadCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.status) params.append('status', filters.status);
      if (filters.is_nri) params.append('is_nri', filters.is_nri);
      
      const response = await axios.get(`${API_URL}/api/customers?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/customers/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = () => {
    loadCustomers();
  };

  const handleAddCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/customers`,
        {
          ...customerForm,
          tenant_id: user.tenant_id,
          tags: customerForm.tags ? customerForm.tags.split(',').map(t => t.trim().toLowerCase()) : []
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAddModal(false);
        resetForm();
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    
    try {
      const response = await axios.put(
        `${API_URL}/api/customers/${selectedCustomer.id}`,
        {
          ...customerForm,
          tags: customerForm.tags ? customerForm.tags.split(',').map(t => t.trim().toLowerCase()) : []
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success('Customer updated');
        setShowEditModal(false);
        setSelectedCustomer(null);
        resetForm();
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Delete this customer?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/customers/${customerId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Customer deleted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const loadPurchaseHistory = async (customerId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/customers/${customerId}/purchase-history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setPurchaseHistory(response.data);
        setShowHistoryModal(true);
      }
    } catch (error) {
      toast.error('Failed to load purchase history');
    }
  };

  const loadWalletData = async (customerId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/customers/${customerId}/wallet`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setWalletData(response.data);
        setShowWalletModal(true);
      }
    } catch (error) {
      toast.error('Failed to load wallet');
    }
  };

  const handleWalletTransaction = async () => {
    if (!walletAction.amount || !walletAction.reason) {
      toast.error('Amount and reason are required');
      return;
    }
    
    try {
      const endpoint = walletAction.type === 'credit' ? 'credit' : 'debit';
      const params = new URLSearchParams({
        amount: walletAction.amount,
        reason: walletAction.reason,
        description: walletAction.description || ''
      });
      
      const response = await axios.post(
        `${API_URL}/api/customers/${selectedCustomer.id}/wallet/${endpoint}?${params}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        loadWalletData(selectedCustomer.id);
        setWalletAction({ type: 'credit', amount: '', reason: '', description: '' });
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transaction failed');
    }
  };

  const resetForm = () => {
    setCustomerForm({
      name: '',
      phone: '',
      alternate_phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      aadhar_number: '',
      pan_number: '',
      is_nri: false,
      passport_number: '',
      country_of_residence: '',
      is_joint_buyer: false,
      preferred_contact_method: 'phone',
      preferred_contact_time: '',
      notes: '',
      tags: ''
    });
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      alternate_phone: customer.alternate_phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      aadhar_number: customer.aadhar_number || '',
      pan_number: customer.pan_number || '',
      is_nri: customer.is_nri || false,
      passport_number: customer.passport_number || '',
      country_of_residence: customer.country_of_residence || '',
      is_joint_buyer: customer.is_joint_buyer || false,
      preferred_contact_method: customer.preferred_contact_method || 'phone',
      preferred_contact_time: customer.preferred_contact_time || '',
      notes: customer.notes || '',
      tags: customer.tags ? customer.tags.join(', ') : ''
    });
    setShowEditModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-xl">
              <Users className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
              <p className="text-slate-500">Manage customer database</p>
            </div>
          </div>
          <Button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="gap-2 bg-teal-600 hover:bg-teal-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-4">
              <p className="text-sm text-teal-600">Total</p>
              <p className="text-2xl font-bold text-teal-800">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-800">{stats.by_status?.active || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600">With Bookings</p>
              <p className="text-2xl font-bold text-blue-800">{stats.with_bookings || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <p className="text-sm text-purple-600">NRI</p>
              <p className="text-2xl font-bold text-purple-800">{stats.nri_count || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="p-4">
              <p className="text-sm text-sky-600">Wallet Balance</p>
              <p className="text-xl font-bold text-sky-800">{formatCurrency(stats.total_wallet_balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="text-xs text-slate-500 mb-1 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-40">
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>
            <div className="w-32">
              <label className="text-xs text-slate-500 mb-1 block">NRI</label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={filters.is_nri}
                onChange={(e) => setFilters(prev => ({ ...prev, is_nri: e.target.value }))}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <Button onClick={handleSearch} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={loadData} variant="ghost">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="customers-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Customer</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Contact</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Location</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Tags</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Wallet</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Status</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-teal-700 font-medium">
                              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{customer.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {customer.is_nri && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> NRI
                                </span>
                              )}
                              {customer.is_joint_buyer && (
                                <span>Joint Buyer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {customer.phone}
                          </p>
                          {customer.email && (
                            <p className="flex items-center gap-1 text-sm text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {customer.city || customer.state ? (
                          <p className="text-sm text-slate-600">
                            {[customer.city, customer.state].filter(Boolean).join(', ')}
                          </p>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {customer.tags?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{customer.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-sky-700">
                          ₹{(customer.wallet_balance || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[customer.status || 'active']}>
                          {customer.status || 'active'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedCustomer(customer); setShowDetailModal(true); }}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadPurchaseHistory(customer.id)}
                            title="Purchase history"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedCustomer(customer); loadWalletData(customer.id); }}
                            title="Wallet"
                          >
                            <Wallet className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(customer)}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Customer Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => { 
        if (!open) { setShowAddModal(false); setShowEditModal(false); setSelectedCustomer(null); resetForm(); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" />
              {showEditModal ? 'Edit Customer' : 'Add Customer'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Full name"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Primary phone"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Alternate Phone</label>
                  <Input
                    placeholder="Alternate phone"
                    value={customerForm.alternate_phone}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, alternate_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Address */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    placeholder="Address"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div>
                  <Input
                    placeholder="City"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Input
                    placeholder="State"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Pincode"
                    value={customerForm.pincode}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, pincode: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            {/* Identity Documents */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Identity Documents</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Aadhar Number</label>
                  <Input
                    placeholder="12-digit Aadhar"
                    value={customerForm.aadhar_number}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, aadhar_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">PAN Number</label>
                  <Input
                    placeholder="ABCDE1234F"
                    value={customerForm.pan_number}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            </div>
            
            {/* NRI Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="is_nri"
                  checked={customerForm.is_nri}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, is_nri: e.target.checked }))}
                />
                <label htmlFor="is_nri" className="text-sm font-semibold text-slate-700">NRI Customer</label>
              </div>
              {customerForm.is_nri && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      placeholder="Passport Number"
                      value={customerForm.passport_number}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, passport_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Country of Residence"
                      value={customerForm.country_of_residence}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, country_of_residence: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Tags & Notes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Additional Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Tags (comma separated)</label>
                  <Input
                    placeholder="e.g., vip, investor, referral"
                    value={customerForm.tags}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm h-20 resize-none"
                    placeholder="Internal notes..."
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { 
                setShowAddModal(false); 
                setShowEditModal(false); 
                setSelectedCustomer(null); 
                resetForm(); 
              }}>
                Cancel
              </Button>
              <Button 
                onClick={showEditModal ? handleUpdateCustomer : handleAddCustomer} 
                className="bg-teal-600 hover:bg-teal-700"
              >
                {showEditModal ? 'Update Customer' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-teal-700">
                    {selectedCustomer.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                  <Badge className={STATUS_COLORS[selectedCustomer.status || 'active']}>
                    {selectedCustomer.status || 'active'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium">{selectedCustomer.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">City</p>
                  <p className="font-medium">{selectedCustomer.city || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">State</p>
                  <p className="font-medium">{selectedCustomer.state || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Aadhar</p>
                  <p className="font-medium">{selectedCustomer.aadhar_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PAN</p>
                  <p className="font-medium">{selectedCustomer.pan_number || '-'}</p>
                </div>
              </div>
              
              <div className="p-4 bg-sky-50 rounded-lg">
                <p className="text-xs text-sky-600">Wallet Balance</p>
                <p className="text-2xl font-bold text-sky-700">
                  ₹{(selectedCustomer.wallet_balance || 0).toLocaleString()}
                </p>
              </div>
              
              {selectedCustomer.tags?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCustomer.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Purchase History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Purchase History
            </DialogTitle>
          </DialogHeader>
          {purchaseHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Total Bookings</p>
                  <p className="text-xl font-bold">{purchaseHistory.summary.total_bookings}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Value</p>
                  <p className="text-xl font-bold">{formatCurrency(purchaseHistory.summary.total_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(purchaseHistory.summary.total_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(purchaseHistory.summary.balance)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Bookings</h4>
                {purchaseHistory.bookings.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No bookings found</p>
                ) : (
                  <div className="space-y-2">
                    {purchaseHistory.bookings.map(booking => (
                      <div key={booking.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.project?.name || 'Project'}</p>
                            <p className="text-sm text-slate-500">
                              {booking.property?.property_number || booking.property?.plot_number || 'Property'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(booking.total_amount)}</p>
                            <Badge variant="outline">{booking.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-sky-600" />
              Customer Wallet
            </DialogTitle>
          </DialogHeader>
          {walletData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-sky-50 rounded-lg">
                <div>
                  <p className="text-xs text-sky-600">Balance</p>
                  <p className="text-xl font-bold text-sky-700">₹{walletData.wallet.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600">Earned</p>
                  <p className="text-lg font-bold text-green-700">₹{walletData.wallet.total_earned.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-red-600">Used</p>
                  <p className="text-lg font-bold text-red-700">₹{walletData.wallet.total_used.toLocaleString()}</p>
                </div>
              </div>
              
              {isAdmin && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-semibold">Add Transaction</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={walletAction.type === 'credit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletAction(prev => ({ ...prev, type: 'credit' }))}
                      className={walletAction.type === 'credit' ? 'bg-green-600' : ''}
                    >
                      Credit
                    </Button>
                    <Button
                      variant={walletAction.type === 'debit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletAction(prev => ({ ...prev, type: 'debit' }))}
                      className={walletAction.type === 'debit' ? 'bg-red-600' : ''}
                    >
                      Debit
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={walletAction.amount}
                    onChange={(e) => setWalletAction(prev => ({ ...prev, amount: e.target.value }))}
                  />
                  <Input
                    placeholder="Reason (e.g., referral_reward)"
                    value={walletAction.reason}
                    onChange={(e) => setWalletAction(prev => ({ ...prev, reason: e.target.value }))}
                  />
                  <Button onClick={handleWalletTransaction} className="w-full">
                    Add Transaction
                  </Button>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Recent Transactions</h4>
                {walletData.transactions.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No transactions</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {walletData.transactions.map(tx => (
                      <div key={tx.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{tx.reason}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className={`font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersManagement;
