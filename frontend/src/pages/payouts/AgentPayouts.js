import React, { useState, useEffect } from 'react';
import { 
  Wallet, Send, Clock, CheckCircle, DollarSign,
  Calendar, Filter, Eye, Download
} from 'lucide-react';
import apiInstance from '../../services/api';
import { toast } from 'sonner';

const AgentPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [approvedCommissions, setApprovedCommissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tenantId, setTenantId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formData, setFormData] = useState({
    staff_id: '',
    commission_earning_ids: [],
    payout_date: '',
    payout_method: 'bank_transfer',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    upi_id: '',
    notes: ''
  });

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (tenantId && isAdmin) {
      fetchPayouts();
    }
  }, [filterStatus, tenantId]);

  const initializeComponent = async () => {
    try {
      const userResponse = await apiInstance.get('/user/me');
      const user = userResponse.data;
      const currentTenantId = user.tenant_id || localStorage.getItem('tenant_id');
      setTenantId(currentTenantId);
      
      const adminRoles = ['tenant_admin', 'super_admin'];
      const admin = adminRoles.includes(user.role);
      setIsAdmin(admin);
      
      if (!admin) {
        toast.error('Only admins can access payouts');
        return;
      }
      
    } catch (error) {
      console.error('Error initializing:', error);
      toast.error('Failed to initialize');
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = { tenant_id: tenantId, limit: 100 };
      if (filterStatus !== 'all') params.status = filterStatus;
      
      const response = await apiInstance.get('/commissions/payouts', { params });
      setPayouts(response.data.payouts || []);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedCommissions = async (staffId) => {
    try {
      const response = await apiInstance.get('/commissions/earnings', {
        params: {
          tenant_id: tenantId,
          staff_id: staffId,
          status: 'approved',
          limit: 100
        }
      });
      setApprovedCommissions(response.data.earnings || []);
    } catch (error) {
      console.error('Error fetching approved commissions:', error);
      toast.error('Failed to load approved commissions');
    }
  };

  const handleCreatePayout = () => {
    setFormData({
      tenant_id: tenantId,
      staff_id: '',
      commission_earning_ids: [],
      payout_date: new Date().toISOString().split('T')[0],
      payout_method: 'bank_transfer',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      upi_id: '',
      notes: ''
    });
    setApprovedCommissions([]);
    setShowCreateModal(true);
  };

  const handleStaffChange = async (staffId) => {
    setFormData(prev => ({ ...prev, staff_id: staffId, commission_earning_ids: [] }));
    if (staffId) {
      await fetchApprovedCommissions(staffId);
    } else {
      setApprovedCommissions([]);
    }
  };

  const handleCommissionToggle = (earningId) => {
    setFormData(prev => ({
      ...prev,
      commission_earning_ids: prev.commission_earning_ids.includes(earningId)
        ? prev.commission_earning_ids.filter(id => id !== earningId)
        : [...prev.commission_earning_ids, earningId]
    }));
  };

  const calculateTotal = () => {
    return approvedCommissions
      .filter(c => formData.commission_earning_ids.includes(c.id))
      .reduce((sum, c) => sum + (c.net_commission || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.commission_earning_ids.length === 0) {
      toast.error('Please select at least one commission');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenant_id: formData.tenant_id,
        staff_id: formData.staff_id,
        commission_earning_ids: formData.commission_earning_ids,
        payout_date: formData.payout_date,
        payout_method: formData.payout_method,
        account_details: {
          account_number: formData.account_number || null,
          ifsc_code: formData.ifsc_code || null,
          bank_name: formData.bank_name || null,
          upi_id: formData.upi_id || null
        },
        notes: formData.notes || null
      };

      const response = await apiInstance.post('/commissions/payouts', payload);
      
      if (response.data.success) {
        toast.success('Payout created successfully');
        setShowCreateModal(false);
        fetchPayouts();
      }
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error(error.response?.data?.detail || 'Failed to create payout');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (payoutId) => {
    try {
      const response = await apiInstance.get(`/commissions/payouts/${payoutId}`);
      setSelectedPayout(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching payout details:', error);
      toast.error('Failed to load payout details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock size={14} />, label: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle size={14} />, label: 'Completed' },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Send size={14} />, label: 'Processing' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Wallet size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only administrators can access the payouts module.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Wallet className="text-green-600" size={36} />
                Agent Payouts
              </h1>
              <p className="text-gray-600 mt-2">Create and manage commission payouts to sales staff</p>
            </div>
            <button
              onClick={handleCreatePayout}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Send size={20} />
              Create Payout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'processing', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Commissions</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payout.payout_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{payout.staff_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {payout.payout_method?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        ₹{(payout.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.commission_count} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payout.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => viewDetails(payout.id)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Payout Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
              <h2 className="text-2xl font-bold text-white">Create Agent Payout</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Staff *
                </label>
                <select
                  required
                  value={formData.staff_id}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Choose staff member --</option>
                  {/* This will be populated from staff hierarchy API */}
                </select>
              </div>

              {/* Approved Commissions Selection */}
              {approvedCommissions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Commissions to Pay ({approvedCommissions.length} approved)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                    {approvedCommissions.map((comm) => (
                      <label key={comm.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.commission_earning_ids.includes(comm.id)}
                          onChange={() => handleCommissionToggle(comm.id)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {comm.commission_type === 'direct' ? 'Direct' : 'Gap'} Commission
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comm.created_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-green-600">
                            ₹{(comm.net_commission || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="mt-3 p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total Payout Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payout Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.payout_date}
                  onChange={(e) => setFormData({...formData, payout_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Payout Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Method *
                </label>
                <select
                  value={formData.payout_method}
                  onChange={(e) => setFormData({...formData, payout_method: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Account Details */}
              {(formData.payout_method === 'bank_transfer' || formData.payout_method === 'cheque') && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800">Bank Account Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={formData.ifsc_code}
                        onChange={(e) => setFormData({...formData, ifsc_code: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="IFSC code"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              )}

              {formData.payout_method === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({...formData, upi_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="user@upi"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
              <h2 className="text-2xl font-bold text-white">Payout Details</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Staff Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedPayout.payout?.staff_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payout Date</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedPayout.payout?.payout_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(selectedPayout.payout?.total_amount || 0).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">{getStatusBadge(selectedPayout.payout?.status)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">
                  Commissions Paid ({selectedPayout.commissions?.length})
                </label>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {selectedPayout.commissions?.map((comm, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comm.commission_type === 'direct' ? 'Direct' : 'Gap'} Commission
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(comm.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-green-600">
                        ₹{(comm.net_commission || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPayouts;
