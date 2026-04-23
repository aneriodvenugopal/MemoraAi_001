import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Users, Edit2, Eye, Phone, Mail, Building2, TrendingUp } from 'lucide-react';
import axios from 'axios';

const VendorsManagement = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('');
  
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_type: 'workforce',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    bank_account_number: '',
    bank_name: '',
    ifsc_code: '',
    upi_id: '',
    status: 'contact',
    notes: ''
  });

  useEffect(() => {
    loadVendors();
  }, [filterStatus, filterType]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenant_id: user.tenant_id,
        status: filterStatus
      });
      if (filterType) params.append('vendor_type', filterType);
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendors?${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setVendors(response.data.vendors);
        setSummary(response.data.summary);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendors`,
        {
          ...formData,
          tenant_id: user.tenant_id
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAddModal(false);
        resetForm();
        loadVendors();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create vendor');
    }
  };

  const handleConvertToActive = async (vendorId, vendorName) => {
    if (!window.confirm(`Convert ${vendorName} to active vendor?`)) return;
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendors/${vendorId}/convert-to-active`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        loadVendors();
      }
    } catch (error) {
      toast.error('Failed to convert vendor');
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      vendor_type: 'workforce',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      bank_account_number: '',
      bank_name: '',
      ifsc_code: '',
      upi_id: '',
      status: 'contact',
      notes: ''
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'workforce': return '👷';
      case 'goods_supplier': return '📦';
      case 'service_provider': return '🔧';
      default: return '👤';
    }
  };

  const getTypeLabel = (type) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors Management</h1>
            <p className="text-gray-600 mt-1">Manage vendors, contacts and suppliers</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{summary.active_vendors}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance Due</p>
                <p className="text-2xl font-bold text-red-600 mt-1">₹{summary.total_balance_due?.toLocaleString() || 0}</p>
              </div>
              <Building2 className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="contact">Contacts</option>
              <option value="active_vendor">Active Vendors</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 mb-2 block">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="workforce">Workforce</option>
              <option value="goods_supplier">Goods Supplier</option>
              <option value="service_provider">Service Provider</option>
              <option value="others">Others</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Due</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(vendor.vendor_type || vendor.category)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{vendor.vendor_name || vendor.name}</p>
                      <p className="text-sm text-gray-500">{vendor.vendor_code || vendor.company_name || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {getTypeLabel(vendor.vendor_type || vendor.category)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="flex items-center gap-1 text-gray-900">
                      <Phone size={14} /> {vendor.phone || '-'}
                    </p>
                    {vendor.email && (
                      <p className="flex items-center gap-1 text-gray-500 mt-1">
                        <Mail size={14} /> {vendor.email}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(vendor.status === 'active_vendor' || vendor.status === 'active') ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                      Contact
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {vendor.status === 'active_vendor' ? (
                    <p className="font-semibold text-red-600">₹{vendor.balance_due?.toLocaleString() || 0}</p>
                  ) : (
                    <p className="text-gray-400">-</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {vendor.status === 'contact' && (
                      <button
                        onClick={() => handleConvertToActive(vendor.id, vendor.vendor_name)}
                        className="px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 text-sm"
                      >
                        Convert to Active
                      </button>
                    )}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {vendors.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No vendors found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Vendor
            </button>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Add New Vendor</h2>
            </div>
            
            <form onSubmit={handleCreateVendor} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Road Construction"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Type *
                  </label>
                  <select
                    value={formData.vendor_type}
                    onChange={(e) => setFormData({...formData, vendor_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="workforce">Workforce</option>
                    <option value="goods_supplier">Goods Supplier</option>
                    <option value="service_provider">Service Provider</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="contact">Contact</option>
                    <option value="active_vendor">Active Vendor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="9876543210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="vendor@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Full address"
                  />
                </div>

                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-3">Bank Details (for payments)</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({...formData, ifsc_code: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="IFSC code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="vendor@upi"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsManagement;