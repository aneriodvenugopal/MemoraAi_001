import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Building2, Wallet, Edit2, Trash2, Share2, Eye, DollarSign } from 'lucide-react';
import axios from 'axios';

const BankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [shareableDetails, setShareableDetails] = useState(null);
  const [projects, setProjects] = useState([]);
  
  const [formData, setFormData] = useState({
    account_number: '',
    account_name: '',
    account_type: 'current',
    bank_name: '',
    branch: '',
    ifsc_code: '',
    account_holder_name: '',
    opening_balance: 0,
    is_primary_online: false,
    notes: '',
    project_id: ''
  });

  useEffect(() => {
    // Only load data when user is available
    if (user?.tenant_id) {
      loadAccounts();
      loadProjects();
    }
  }, [user?.tenant_id]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/projects/`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      // API returns array directly
      if (Array.isArray(response.data)) {
        setProjects(response.data);
      } else if (response.data.projects) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadAccounts = async () => {
    if (!user?.tenant_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/bank-accounts?tenant_id=${user.tenant_id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setAccounts(response.data.accounts);
        setSummary(response.data.summary);
      }
    } catch (error) {
      toast.error('Failed to load bank accounts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    // Validate project_id
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/bank-accounts`,
        {
          ...formData,
          tenant_id: user.tenant_id,
          opening_balance: parseFloat(formData.opening_balance) || 0
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowAddModal(false);
        resetForm();
        loadAccounts();
      }
    } catch (error) {
      // Handle validation errors (array of error objects)
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        const errorMessages = error.response.data.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
        toast.error(errorMessages);
      } else if (typeof error.response?.data?.detail === 'string') {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to create account');
      }
      console.error('Account creation error:', error.response?.data);
    }
  };

  const handleCreateCashAccount = () => {
    setFormData({
      account_number: '1111111',
      account_name: 'Cash Account',
      account_type: 'cash',
      bank_name: 'Cash',
      branch: '',
      ifsc_code: '',
      account_holder_name: user.tenant_name || 'Cash',
      opening_balance: 0,
      is_primary_online: false,
      notes: 'Main cash account',
      project_id: projects.length > 0 ? projects[0].id : ''
    });
    setShowAddModal(true);
  };

  const handleShareBankDetails = async (account) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/bank-accounts/shareable/${account.id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setShareableDetails(response.data);
        setSelectedAccount(account);
        setShowShareModal(true);
      }
    } catch (error) {
      toast.error('Failed to get shareable details');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const resetForm = () => {
    setFormData({
      account_number: '',
      account_name: '',
      account_type: 'current',
      bank_name: '',
      branch: '',
      ifsc_code: '',
      account_holder_name: '',
      opening_balance: 0,
      is_primary_online: false,
      notes: '',
      project_id: ''
    });
  };

  const getAccountIcon = (account) => {
    if (account.account_number === '1111111') {
      return <Wallet className="w-8 h-8 text-green-600" />;
    }
    return <Building2 className="w-8 h-8 text-blue-600" />;
  };

  const getBalanceColor = (balance) => {
    if (balance > 100000) return 'text-green-600';
    if (balance > 10000) return 'text-blue-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
            <p className="text-gray-600 mt-1">Manage bank accounts and cash</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateCashAccount}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Wallet size={20} />
              Add Cash Account
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Add Bank Account
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_accounts}</p>
              </div>
              <Building2 className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₹{summary.total_balance.toLocaleString()}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Balance</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">₹{summary.cash_balance.toLocaleString()}</p>
              </div>
              <Wallet className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bank Balance</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">₹{summary.bank_balance.toLocaleString()}</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getAccountIcon(account)}
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{account.account_name}</h3>
                  <p className="text-sm text-gray-600">{account.account_number}</p>
                  {account.bank_name && account.bank_name !== 'Cash' && (
                    <p className="text-xs text-gray-500">{account.bank_name}</p>
                  )}
                </div>
              </div>
              
              {account.is_primary_online && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  Primary Online
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">Current Balance</p>
                <p className={`text-xl font-bold ${getBalanceColor(account.current_balance)}`}>
                  ₹{account.current_balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Available Balance</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{account.available_balance.toLocaleString()}
                </p>
              </div>
            </div>

            {account.branch && (
              <p className="text-xs text-gray-600 mb-4">
                <span className="font-semibold">Branch:</span> {account.branch}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleShareBankDetails(account)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm"
              >
                <Share2 size={16} />
                Share Details
              </button>
              <button
                className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No bank accounts added yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add First Account
          </button>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Add New Account</h2>
            </div>
            
            <form onSubmit={handleCreateAccount} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project * <span className="text-xs text-gray-500">(Bank accounts are project-specific)</span>
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">No projects found. Please create a project first.</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type *
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({...formData, account_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="cash">Cash Account</option>
                    <option value="current">Current Account</option>
                    <option value="savings">Savings Account</option>
                    <option value="fd">Fixed Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1111111 for cash"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Cash Account, SBI Current"
                    required
                  />
                </div>

                {formData.account_type !== 'cash' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., State Bank of India"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) => setFormData({...formData, branch: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Branch name"
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
                        placeholder="SBIN0001234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={formData.account_holder_name}
                        onChange={(e) => setFormData({...formData, account_holder_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Account holder name"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({...formData, opening_balance: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.01"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_primary_online}
                      onChange={(e) => setFormData({...formData, is_primary_online: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Mark as primary account for online payments
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Details Modal */}
      {showShareModal && shareableDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Share Bank Details</h2>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {shareableDetails.formatted_text}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(shareableDetails.formatted_text)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  Copy Details
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;