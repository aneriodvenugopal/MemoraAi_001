import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowRight, Wallet, Building2, DollarSign } from 'lucide-react';
import axios from 'axios';

const PaymentTransfer = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_id: '',
    from_account_id: '',
    amount: '',
    payment_mode: 'neft',
    transaction_id: '',
    cheque_number: '',
    cheque_date: '',
    notes: ''
  });

  useEffect(() => {
    loadVendors();
    loadBankAccounts();
  }, []);

  useEffect(() => {
    if (formData.vendor_id) {
      loadVendorBills(formData.vendor_id);
    }
  }, [formData.vendor_id]);

  const loadVendors = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendors?tenant_id=${user.tenant_id}&status=active_vendor`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) setVendors(response.data.active_vendors || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadVendorBills = async (vendorId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendor-bills?tenant_id=${user.tenant_id}&vendor_id=${vendorId}&status=pending`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setBills(response.data.bills);
        const vendor = vendors.find(v => v.id === vendorId);
        setSelectedVendor(vendor);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/bank-accounts?tenant_id=${user.tenant_id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) setBankAccounts(response.data.accounts || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/payment-transfer`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
          tenant_id: user.tenant_id
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
        loadVendors();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      bill_id: '',
      from_account_id: '',
      amount: '',
      payment_mode: 'neft',
      transaction_id: '',
      cheque_number: '',
      cheque_date: '',
      notes: ''
    });
    setSelectedVendor(null);
    setBills([]);
  };

  const selectedBill = bills.find(b => b.id === formData.bill_id);
  const selectedAccount = bankAccounts.find(a => a.id === formData.from_account_id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Transfer</h1>
        <p className="text-gray-600 mt-1">Make payment to vendors</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <form onSubmit={handleMakePayment} className="space-y-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
            <select
              value={formData.vendor_id}
              onChange={(e) => setFormData({...formData, vendor_id: e.target.value, bill_id: ''})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
              required
            >
              <option value="">Choose vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.vendor_name} - Due: ₹{v.balance_due?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Info */}
          {selectedVendor && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Billed</p>
                  <p className="text-xl font-bold text-gray-900">₹{selectedVendor.total_billed?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance Due</p>
                  <p className="text-xl font-bold text-red-600">₹{selectedVendor.balance_due?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bill Selection */}
          {formData.vendor_id && bills.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Bill (Optional)</label>
              <select
                value={formData.bill_id}
                onChange={(e) => setFormData({...formData, bill_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No specific bill (General payment)</option>
                {bills.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bill_number} - {b.description} - Balance: ₹{b.balance_amount?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bill Info */}
          {selectedBill && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Committed</p>
                  <p className="text-lg font-semibold text-gray-900">₹{selectedBill.committed_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-lg font-semibold text-green-600">₹{selectedBill.paid_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="text-lg font-semibold text-red-600">₹{selectedBill.balance_amount?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pay From Account *</label>
            <select
              value={formData.from_account_id}
              onChange={(e) => setFormData({...formData, from_account_id: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
              required
            >
              <option value="">Choose account...</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_number === '1111111' ? '💵' : '🏦'} {a.account_name} - Available: ₹{a.available_balance?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 text-lg">₹</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="14000"
                step="0.01"
                required
              />
            </div>
            {selectedAccount && parseFloat(formData.amount) > selectedAccount.available_balance && (
              <p className="text-red-600 text-sm mt-1">⚠️ Insufficient balance</p>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['cash', 'neft', 'rtgs', 'upi', 'cheque'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({...formData, payment_mode: mode})}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    formData.payment_mode === mode
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          {formData.payment_mode !== 'cash' && formData.payment_mode !== 'cheque' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
              <input
                type="text"
                value={formData.transaction_id}
                onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="NEFT/RTGS/UPI transaction ID"
              />
            </div>
          )}

          {/* Cheque Details */}
          {formData.payment_mode === 'cheque' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
                <input
                  type="text"
                  value={formData.cheque_number}
                  onChange={(e) => setFormData({...formData, cheque_number: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Date</label>
                <input
                  type="date"
                  value={formData.cheque_date}
                  onChange={(e) => setFormData({...formData, cheque_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading || (selectedAccount && parseFloat(formData.amount) > selectedAccount.available_balance)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : (
                <>
                  <DollarSign size={20} />
                  Make Payment
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentTransfer;