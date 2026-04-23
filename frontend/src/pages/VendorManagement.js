/**
 * Vendor Management
 * - Vendor directory
 * - Bill management
 * - Payment tracking
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, Building, DollarSign, AlertTriangle, CheckCircle,
  RefreshCw, Plus, Eye, Edit, Trash2, CreditCard, FileText,
  ArrowLeft, Phone, Mail, MapPin, Search, TrendingUp, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  blacklisted: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const CATEGORIES = [
  { value: 'construction', label: 'Construction' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'interior', label: 'Interior' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'legal', label: 'Legal' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'security', label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
];

const VendorManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vendors');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialogs
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    company_name: '',
    category: 'other',
    phone: '',
    email: '',
    address: '',
    city: '',
    gstin: '',
    pan: '',
    bank_name: '',
    bank_account: '',
    ifsc_code: '',
    notes: ''
  });
  
  const [billForm, setBillForm] = useState({
    vendor_id: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: 0,
    tax_amount: 0,
    description: '',
    notes: ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    vendor_id: '',
    bill_id: '',
    amount: 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    description: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/stats`, { headers });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [token]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/vendor-management/vendors?limit=100`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, categoryFilter, statusFilter]);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/vendor-management/bills?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setBills(data.bills || []);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/payments?limit=100`, { headers });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    fetchVendors();
  }, [fetchStats, fetchVendors]);

  useEffect(() => {
    if (activeTab === 'bills') fetchBills();
    if (activeTab === 'payments') fetchPayments();
  }, [activeTab, fetchBills, fetchPayments]);

  // Create/Update Vendor
  const handleSaveVendor = async () => {
    if (!vendorForm.name || !vendorForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    
    setLoading(true);
    try {
      const url = editMode
        ? `${API_URL}/api/vendor-management/vendors/${selectedVendor.id}`
        : `${API_URL}/api/vendor-management/vendors`;
      
      const res = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(vendorForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(editMode ? 'Vendor updated' : 'Vendor created');
        setShowVendorDialog(false);
        resetVendorForm();
        fetchVendors();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to save vendor');
      }
    } catch (err) {
      toast.error('Error saving vendor');
    } finally {
      setLoading(false);
    }
  };

  // Create Bill
  const handleCreateBill = async () => {
    if (!billForm.vendor_id || !billForm.bill_number || !billForm.amount) {
      toast.error('Vendor, bill number and amount are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/bills`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...billForm,
          bill_date: new Date(billForm.bill_date).toISOString(),
          due_date: new Date(billForm.due_date).toISOString()
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Bill created');
        setShowBillDialog(false);
        resetBillForm();
        fetchBills();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to create bill');
      }
    } catch (err) {
      toast.error('Error creating bill');
    } finally {
      setLoading(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async () => {
    if (!paymentForm.vendor_id || !paymentForm.amount) {
      toast.error('Vendor and amount are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Payment recorded');
        setShowPaymentDialog(false);
        resetPaymentForm();
        fetchPayments();
        fetchBills();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to record payment');
      }
    } catch (err) {
      toast.error('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  // View Vendor Details
  const handleViewVendor = async (vendor) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/vendors/${vendor.id}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setSelectedVendor({ ...data.vendor, bills: data.bills, payments: data.payments, summary: data.summary });
        setShowDetailDialog(true);
      }
    } catch (err) {
      toast.error('Error fetching vendor details');
    } finally {
      setLoading(false);
    }
  };

  // Edit Vendor
  const handleEditVendor = (vendor) => {
    setVendorForm({
      name: vendor.name || '',
      company_name: vendor.company_name || '',
      category: vendor.category || 'other',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      gstin: vendor.gstin || '',
      pan: vendor.pan || '',
      bank_name: vendor.bank_name || '',
      bank_account: vendor.bank_account || '',
      ifsc_code: vendor.ifsc_code || '',
      notes: vendor.notes || ''
    });
    setSelectedVendor(vendor);
    setEditMode(true);
    setShowVendorDialog(true);
  };

  // Delete Vendor
  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to deactivate this vendor?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor-management/vendors/${vendorId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Vendor deactivated');
        fetchVendors();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed to delete vendor');
      }
    } catch (err) {
      toast.error('Error deleting vendor');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetVendorForm = () => {
    setVendorForm({
      name: '', company_name: '', category: 'other', phone: '', email: '',
      address: '', city: '', gstin: '', pan: '', bank_name: '', bank_account: '',
      ifsc_code: '', notes: ''
    });
    setSelectedVendor(null);
    setEditMode(false);
  };

  const resetBillForm = () => {
    setBillForm({
      vendor_id: '', bill_number: '', bill_date: new Date().toISOString().split('T')[0],
      due_date: '', amount: 0, tax_amount: 0, description: '', notes: ''
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      vendor_id: '', bill_id: '', amount: 0, payment_method: 'bank_transfer',
      reference_number: '', description: ''
    });
  };

  // Format currency
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="vendor-management-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-indigo-600" />
                Vendor Management
              </h1>
              <p className="text-gray-500 mt-1">Manage vendors, bills and payments</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchStats(); fetchVendors(); }} disabled={loading} data-testid="refresh-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => { resetVendorForm(); setShowVendorDialog(true); }} data-testid="add-vendor-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>

        {/* Stats - Clickable Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <ClickableStatCard 
              title="Total Vendors" 
              value={stats.total_vendors} 
              icon={Users} 
              color="blue"
              subtitle={`${stats.active_vendors} active`}
              onClick={() => setActiveTab('vendors')}
              className={activeTab === 'vendors' ? 'ring-2 ring-blue-500' : ''}
            />
            <ClickableStatCard 
              title="Total Billed" 
              value={formatCurrency(stats.total_billed)} 
              icon={FileText} 
              color="purple"
              onClick={() => setActiveTab('bills')}
              className={activeTab === 'bills' ? 'ring-2 ring-purple-500' : ''}
            />
            <ClickableStatCard 
              title="Total Paid" 
              value={formatCurrency(stats.total_paid)} 
              icon={CheckCircle} 
              color="green"
              onClick={() => setActiveTab('payments')}
              className={activeTab === 'payments' ? 'ring-2 ring-green-500' : ''}
            />
            <ClickableStatCard 
              title="Outstanding" 
              value={formatCurrency(stats.total_outstanding)} 
              icon={Clock} 
              color="yellow"
            />
            <ClickableStatCard 
              title="Overdue" 
              value={stats.overdue_count} 
              icon={AlertTriangle} 
              color="red"
              subtitle={formatCurrency(stats.overdue_amount)}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="vendors" data-testid="vendors-tab">
              <Users className="w-4 h-4 mr-2" />Vendors ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="bills" data-testid="bills-tab">
              <FileText className="w-4 h-4 mr-2" />Bills ({bills.length})
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="payments-tab">
              <CreditCard className="w-4 h-4 mr-2" />Payments
            </TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-4">
            {/* Filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search vendors..."
                        className="pl-10"
                        data-testid="search-input"
                      />
                    </div>
                  </div>
                  <div className="w-48">
                    <Label className="text-sm">Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger data-testid="category-filter">
                        <SelectValue placeholder="All Categories" />
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
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {vendors.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No vendors found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {vendors.map((vendor) => (
                      <div key={vendor.id} className="p-4 hover:bg-gray-50" data-testid={`vendor-item-${vendor.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{vendor.name}</span>
                              {vendor.company_name && <span className="text-gray-500">({vendor.company_name})</span>}
                              <Badge className={STATUS_COLORS[vendor.status]}>{vendor.status}</Badge>
                              <Badge variant="outline">{vendor.category}</Badge>
                            </div>
                            <div className="flex gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{vendor.phone}</span>
                              {vendor.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.email}</span>}
                              {vendor.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.city}</span>}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span>Billed: {formatCurrency(vendor.total_billed)}</span>
                              <span className="text-green-600">Paid: {formatCurrency(vendor.total_paid)}</span>
                              {vendor.outstanding > 0 && <span className="text-red-600">Due: {formatCurrency(vendor.outstanding)}</span>}
                              {vendor.pending_bills > 0 && <span className="text-yellow-600">{vendor.pending_bills} pending bills</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleViewVendor(vendor)} data-testid={`view-btn-${vendor.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEditVendor(vendor)} data-testid={`edit-btn-${vendor.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteVendor(vendor.id)} data-testid={`delete-btn-${vendor.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowBillDialog(true)} data-testid="add-bill-btn">
                <Plus className="w-4 h-4 mr-2" />Add Bill
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {bills.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bills found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {bills.map((bill) => (
                      <div key={bill.id} className="p-4 hover:bg-gray-50" data-testid={`bill-item-${bill.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{bill.bill_number}</span>
                              <Badge className={STATUS_COLORS[bill.status]}>{bill.status}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{bill.vendor_name}</p>
                            <p className="text-sm text-gray-500">{bill.description}</p>
                            <div className="flex gap-4 text-sm">
                              <span>Bill Date: {formatDate(bill.bill_date)}</span>
                              <span>Due: {formatDate(bill.due_date)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{formatCurrency(bill.total_amount)}</p>
                            {bill.paid_amount > 0 && <p className="text-sm text-green-600">Paid: {formatCurrency(bill.paid_amount)}</p>}
                            {bill.balance_amount > 0 && <p className="text-sm text-red-600">Balance: {formatCurrency(bill.balance_amount)}</p>}
                            {bill.status !== 'paid' && (
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setPaymentForm({
                                    vendor_id: bill.vendor_id,
                                    bill_id: bill.id,
                                    amount: bill.balance_amount || bill.total_amount,
                                    payment_method: 'bank_transfer',
                                    reference_number: '',
                                    description: `Payment for ${bill.bill_number}`
                                  });
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />Pay
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

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { resetPaymentForm(); setShowPaymentDialog(true); }} data-testid="add-payment-btn">
                <Plus className="w-4 h-4 mr-2" />Record Payment
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {payments.map((payment) => (
                      <div key={payment.id} className="p-4 hover:bg-gray-50" data-testid={`payment-item-${payment.id}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{payment.vendor_name}</p>
                            <p className="text-sm text-gray-600">{payment.payment_method.replace('_', ' ')}</p>
                            {payment.reference_number && <p className="text-sm text-gray-500">Ref: {payment.reference_number}</p>}
                            <p className="text-xs text-gray-400">{formatDate(payment.payment_date)}</p>
                          </div>
                          <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Vendor Dialog */}
        <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} data-testid="vendor-name-input" />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input value={vendorForm.company_name} onChange={(e) => setVendorForm({ ...vendorForm, company_name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={vendorForm.category} onValueChange={(v) => setVendorForm({ ...vendorForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} data-testid="vendor-phone-input" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} type="email" />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={vendorForm.city} onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })} />
              </div>
              <div>
                <Label>GSTIN</Label>
                <Input value={vendorForm.gstin} onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })} />
              </div>
              <div>
                <Label>PAN</Label>
                <Input value={vendorForm.pan} onChange={(e) => setVendorForm({ ...vendorForm, pan: e.target.value })} />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={vendorForm.bank_name} onChange={(e) => setVendorForm({ ...vendorForm, bank_name: e.target.value })} />
              </div>
              <div>
                <Label>Bank Account</Label>
                <Input value={vendorForm.bank_account} onChange={(e) => setVendorForm({ ...vendorForm, bank_account: e.target.value })} />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input value={vendorForm.ifsc_code} onChange={(e) => setVendorForm({ ...vendorForm, ifsc_code: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVendorDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveVendor} disabled={loading} data-testid="save-vendor-btn">
                {loading ? 'Saving...' : 'Save Vendor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bill Dialog */}
        <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Vendor *</Label>
                <Select value={billForm.vendor_id} onValueChange={(v) => setBillForm({ ...billForm, vendor_id: v })}>
                  <SelectTrigger data-testid="bill-vendor-select"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.status === 'active').map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bill Number *</Label>
                <Input value={billForm.bill_number} onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })} data-testid="bill-number-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bill Date</Label>
                  <Input type="date" value={billForm.bill_date} onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })} />
                </div>
                <div>
                  <Label>Due Date *</Label>
                  <Input type="date" value={billForm.due_date} onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })} data-testid="due-date-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: parseFloat(e.target.value) || 0 })} data-testid="bill-amount-input" />
                </div>
                <div>
                  <Label>Tax Amount</Label>
                  <Input type="number" value={billForm.tax_amount} onChange={(e) => setBillForm({ ...billForm, tax_amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={billForm.description} onChange={(e) => setBillForm({ ...billForm, description: e.target.value })} rows={2} data-testid="bill-description-input" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBillDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateBill} disabled={loading} data-testid="create-bill-btn">
                {loading ? 'Creating...' : 'Create Bill'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Vendor *</Label>
                <Select value={paymentForm.vendor_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, vendor_id: v })}>
                  <SelectTrigger data-testid="payment-vendor-select"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.status === 'active').map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} data-testid="payment-amount-input" />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={loading} data-testid="record-payment-btn">
                {loading ? 'Processing...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vendor Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vendor Details</DialogTitle>
            </DialogHeader>
            {selectedVendor && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Name</Label>
                    <p className="font-medium">{selectedVendor.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Company</Label>
                    <p>{selectedVendor.company_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Phone</Label>
                    <p>{selectedVendor.phone}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Email</Label>
                    <p>{selectedVendor.email || '-'}</p>
                  </div>
                </div>
                {selectedVendor.summary && (
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatCurrency(selectedVendor.summary.total_billed)}</p>
                      <p className="text-xs text-gray-500">Total Billed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedVendor.summary.total_paid)}</p>
                      <p className="text-xs text-gray-500">Total Paid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedVendor.summary.outstanding)}</p>
                      <p className="text-xs text-gray-500">Outstanding</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{selectedVendor.summary.pending_bills}</p>
                      <p className="text-xs text-gray-500">Pending Bills</p>
                    </div>
                  </div>
                )}
                {selectedVendor.bills && selectedVendor.bills.length > 0 && (
                  <div>
                    <Label className="text-gray-500 mb-2 block">Recent Bills</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedVendor.bills.slice(0, 5).map((bill) => (
                        <div key={bill.id} className="p-2 bg-gray-50 rounded flex justify-between">
                          <span>{bill.bill_number} - {bill.description?.slice(0, 30)}</span>
                          <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VendorManagement;
