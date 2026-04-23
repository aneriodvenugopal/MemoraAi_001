/**
 * Referral & Wallet Management
 * - Create and track referrals
 * - Manage customer wallets
 * - Process withdrawals
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
  Users, Gift, Wallet, ArrowUpRight, ArrowDownRight, Copy, CheckCircle, XCircle,
  RefreshCw, Plus, Eye, DollarSign, TrendingUp, Clock, Share2, ArrowLeft,
  CreditCard, Send, Award, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  registered: 'bg-blue-100 text-blue-800',
  qualified: 'bg-purple-100 text-purple-800',
  rewarded: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const ReferralWalletManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [referralStats, setReferralStats] = useState(null);
  const [walletStats, setWalletStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialogs
  const [showCreateReferralDialog, setShowCreateReferralDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [walletData, setWalletData] = useState(null);
  
  // Form state
  const [referralForm, setReferralForm] = useState({
    referrer_id: '',
    reward_amount: 1000,
    reward_type: 'cash',
    qualification_type: 'site_visit',
    expires_days: 90
  });
  
  const [withdrawalForm, setWithdrawalForm] = useState({
    customer_id: '',
    amount: 0,
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    account_holder_name: '',
    upi_id: ''
  });
  
  const [processForm, setProcessForm] = useState({
    approved: true,
    transaction_reference: '',
    rejection_reason: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch functions
  const fetchReferralStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/referrals/stats`, { headers });
      const data = await res.json();
      if (data.success) {
        setReferralStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching referral stats:', err);
    }
  }, [token]);

  const fetchWalletStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/stats`, { headers });
      const data = await res.json();
      if (data.success) {
        setWalletStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching wallet stats:', err);
    }
  }, [token]);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/referral-wallet/referrals?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/withdrawals?limit=100`, { headers });
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/customers-management/customers?limit=200`, { headers });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchReferralStats();
    fetchWalletStats();
    fetchCustomers();
  }, [fetchReferralStats, fetchWalletStats, fetchCustomers]);

  useEffect(() => {
    if (activeTab === 'referrals') fetchReferrals();
    if (activeTab === 'withdrawals') fetchWithdrawals();
  }, [activeTab, fetchReferrals, fetchWithdrawals]);

  // Create Referral
  const handleCreateReferral = async () => {
    if (!referralForm.referrer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/referrals/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(referralForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Referral code created: ${data.referral_code}`);
        setShowCreateReferralDialog(false);
        setReferralForm({
          referrer_id: '',
          reward_amount: 1000,
          reward_type: 'cash',
          qualification_type: 'site_visit',
          expires_days: 90
        });
        fetchReferrals();
        fetchReferralStats();
      } else {
        toast.error(data.detail || 'Failed to create referral');
      }
    } catch (err) {
      toast.error('Error creating referral');
    } finally {
      setLoading(false);
    }
  };

  // Qualify Referral
  const handleQualifyReferral = async (referralId) => {
    if (!window.confirm('Mark this referral as qualified and credit reward?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/referrals/qualify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ referral_id: referralId })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchReferrals();
        fetchReferralStats();
        fetchWalletStats();
      } else {
        toast.error(data.detail || 'Failed to qualify referral');
      }
    } catch (err) {
      toast.error('Error qualifying referral');
    } finally {
      setLoading(false);
    }
  };

  // View Wallet
  const handleViewWallet = async (customerId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/wallet/${customerId}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setWalletData(data);
        setShowWalletDialog(true);
      } else {
        toast.error('Failed to load wallet');
      }
    } catch (err) {
      toast.error('Error loading wallet');
    } finally {
      setLoading(false);
    }
  };

  // Request Withdrawal
  const handleRequestWithdrawal = async () => {
    if (!withdrawalForm.customer_id || withdrawalForm.amount <= 0) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/referral-wallet/withdrawals/request?customer_id=${withdrawalForm.customer_id}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(withdrawalForm)
        }
      );
      const data = await res.json();
      
      if (data.success) {
        toast.success('Withdrawal request submitted');
        setShowWithdrawalDialog(false);
        setWithdrawalForm({
          customer_id: '',
          amount: 0,
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          account_holder_name: '',
          upi_id: ''
        });
        fetchWithdrawals();
        fetchWalletStats();
      } else {
        toast.error(data.detail || 'Failed to submit withdrawal');
      }
    } catch (err) {
      toast.error('Error submitting withdrawal');
    } finally {
      setLoading(false);
    }
  };

  // Process Withdrawal
  const handleProcessWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    
    if (!processForm.approved && !processForm.rejection_reason) {
      toast.error('Please provide rejection reason');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/referral-wallet/withdrawals/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          withdrawal_id: selectedWithdrawal.id,
          ...processForm
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowProcessDialog(false);
        setSelectedWithdrawal(null);
        setProcessForm({ approved: true, transaction_reference: '', rejection_reason: '' });
        fetchWithdrawals();
        fetchWalletStats();
      } else {
        toast.error(data.detail || 'Failed to process withdrawal');
      }
    } catch (err) {
      toast.error('Error processing withdrawal');
    } finally {
      setLoading(false);
    }
  };

  // Copy referral code
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
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
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-testid="referral-wallet-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-7 h-7 text-indigo-600" />
                Referral & Wallet
              </h1>
              <p className="text-gray-500 mt-1">Manage referrals, rewards, and customer wallets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchReferralStats(); fetchWalletStats(); }} disabled={loading} data-testid="refresh-btn">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateReferralDialog(true)} data-testid="create-referral-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Referral
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {referralStats && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg"><Share2 className="w-5 h-5 text-indigo-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Total Referrals</p>
                      <p className="text-2xl font-bold">{referralStats.total_referrals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg"><Award className="w-5 h-5 text-green-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Rewards Paid</p>
                      <p className="text-xl font-bold">{formatCurrency(referralStats.total_rewards_paid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Rewards</p>
                      <p className="text-xl font-bold">{formatCurrency(referralStats.pending_rewards)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {walletStats && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Total Balance</p>
                      <p className="text-xl font-bold">{formatCurrency(walletStats.total_balance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Total Earned</p>
                      <p className="text-xl font-bold">{formatCurrency(walletStats.total_earned)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg"><Send className="w-5 h-5 text-orange-600" /></div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Withdrawals</p>
                      <p className="text-xl font-bold">{walletStats.pending_withdrawals}</p>
                      <p className="text-xs text-orange-600">{formatCurrency(walletStats.pending_withdrawal_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <TrendingUp className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="referrals-tab">
              <Share2 className="w-4 h-4 mr-2" />Referrals
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="withdrawals-tab">
              <Send className="w-4 h-4 mr-2" />Withdrawals
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Referral Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-indigo-600" />
                    Referral Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {referralStats && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span>Conversion Rate</span>
                        <span className="text-xl font-bold text-green-600">{referralStats.conversion_rate}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-yellow-50 rounded-lg text-center">
                          <p className="text-2xl font-bold text-yellow-600">{referralStats.by_status?.pending || 0}</p>
                          <p className="text-sm text-gray-600">Pending</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{referralStats.by_status?.registered || 0}</p>
                          <p className="text-sm text-gray-600">Registered</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{referralStats.by_status?.rewarded || 0}</p>
                          <p className="text-sm text-gray-600">Rewarded</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg text-center">
                          <p className="text-2xl font-bold text-gray-600">{referralStats.by_status?.expired || 0}</p>
                          <p className="text-sm text-gray-600">Expired</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Wallet Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    Wallet Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {walletStats && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span>Active Wallets</span>
                        <span className="text-xl font-bold">{walletStats.total_wallets}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Earned</span>
                          <span className="font-medium text-green-600">{formatCurrency(walletStats.total_earned)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Withdrawn</span>
                          <span className="font-medium text-orange-600">{formatCurrency(walletStats.total_withdrawn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Balance</span>
                          <span className="font-bold text-blue-600">{formatCurrency(walletStats.total_balance)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="mt-4">
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-48">
                    <Label className="text-sm">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="status-filter">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="rewarded">Rewarded</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-0">
                {referrals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No referrals found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="p-4 hover:bg-gray-50" data-testid={`referral-item-${referral.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{referral.referral_code}</span>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(referral.referral_code)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Badge className={STATUS_COLORS[referral.status]}>{referral.status}</Badge>
                            </div>
                            <p className="text-sm"><strong>Referrer:</strong> {referral.referrer_name} ({referral.referrer_phone})</p>
                            {referral.referred_name && (
                              <p className="text-sm text-gray-600">
                                <strong>Referred:</strong> {referral.referred_name} ({referral.referred_phone})
                              </p>
                            )}
                            <div className="flex gap-4 text-sm text-gray-500">
                              <span>Reward: {formatCurrency(referral.reward_amount)}</span>
                              <span>Type: {referral.qualification_type}</span>
                              <span>Created: {formatDate(referral.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {referral.status === 'registered' && (
                              <Button size="sm" onClick={() => handleQualifyReferral(referral.id)} data-testid={`qualify-btn-${referral.id}`}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Qualify & Reward
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleViewWallet(referral.referrer_id)}>
                              <Wallet className="w-4 h-4 mr-1" />
                              View Wallet
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

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowWithdrawalDialog(true)} data-testid="request-withdrawal-btn">
                <Plus className="w-4 h-4 mr-2" />Request Withdrawal
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No withdrawal requests</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="p-4 hover:bg-gray-50" data-testid={`withdrawal-item-${withdrawal.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{withdrawal.customer_name}</span>
                              <Badge className={STATUS_COLORS[withdrawal.status]}>{withdrawal.status}</Badge>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(withdrawal.amount)}</p>
                            {withdrawal.bank_name && (
                              <p className="text-sm text-gray-600">
                                {withdrawal.bank_name} - {withdrawal.account_number?.slice(-4)}
                              </p>
                            )}
                            {withdrawal.upi_id && (
                              <p className="text-sm text-gray-600">UPI: {withdrawal.upi_id}</p>
                            )}
                            <p className="text-xs text-gray-500">{formatDate(withdrawal.created_at)}</p>
                          </div>
                          <div>
                            {withdrawal.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setShowProcessDialog(true);
                                }}
                                data-testid={`process-btn-${withdrawal.id}`}
                              >
                                Process
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

        {/* Create Referral Dialog */}
        <Dialog open={showCreateReferralDialog} onOpenChange={setShowCreateReferralDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Referral Code</DialogTitle>
              <DialogDescription>Generate a referral code for an existing customer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Customer (Referrer) *</Label>
                <Select value={referralForm.referrer_id} onValueChange={(v) => setReferralForm({ ...referralForm, referrer_id: v })}>
                  <SelectTrigger data-testid="referrer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reward Amount</Label>
                  <Input
                    type="number"
                    value={referralForm.reward_amount}
                    onChange={(e) => setReferralForm({ ...referralForm, reward_amount: parseFloat(e.target.value) || 0 })}
                    data-testid="reward-amount-input"
                  />
                </div>
                <div>
                  <Label>Qualification Type</Label>
                  <Select value={referralForm.qualification_type} onValueChange={(v) => setReferralForm({ ...referralForm, qualification_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="registration">Registration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Expires In (days)</Label>
                <Input
                  type="number"
                  value={referralForm.expires_days}
                  onChange={(e) => setReferralForm({ ...referralForm, expires_days: parseInt(e.target.value) || 90 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateReferralDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateReferral} disabled={loading} data-testid="create-referral-submit-btn">
                {loading ? 'Creating...' : 'Create Referral'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Wallet Dialog */}
        <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Wallet Details</DialogTitle>
            </DialogHeader>
            {walletData && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
                  <p className="text-sm opacity-80">{walletData.customer?.name}</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(walletData.wallet?.balance)}</p>
                  <p className="text-sm opacity-80 mt-1">Available Balance</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(walletData.wallet?.total_earned)}</p>
                    <p className="text-xs text-gray-500">Total Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(walletData.wallet?.total_withdrawn)}</p>
                    <p className="text-xs text-gray-500">Withdrawn</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(walletData.wallet?.total_used)}</p>
                    <p className="text-xs text-gray-500">Used</p>
                  </div>
                </div>
                {walletData.transactions?.length > 0 && (
                  <div>
                    <Label className="text-sm text-gray-500">Recent Transactions</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
                      {walletData.transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm">{tx.description}</p>
                            <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                          </div>
                          <span className={`font-medium ${tx.transaction_type.includes('credit') || tx.transaction_type === 'referral_reward' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.transaction_type.includes('credit') || tx.transaction_type === 'referral_reward' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWalletDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdrawal Request Dialog */}
        <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Customer *</Label>
                <Select value={withdrawalForm.customer_id} onValueChange={(v) => setWithdrawalForm({ ...withdrawalForm, customer_id: v })}>
                  <SelectTrigger data-testid="withdrawal-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                  data-testid="withdrawal-amount-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input value={withdrawalForm.bank_name} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })} />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={withdrawalForm.account_number} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IFSC Code</Label>
                  <Input value={withdrawalForm.ifsc_code} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, ifsc_code: e.target.value })} />
                </div>
                <div>
                  <Label>UPI ID</Label>
                  <Input value={withdrawalForm.upi_id} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, upi_id: e.target.value })} placeholder="name@upi" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawalDialog(false)}>Cancel</Button>
              <Button onClick={handleRequestWithdrawal} disabled={loading} data-testid="submit-withdrawal-btn">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Withdrawal Dialog */}
        <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Process Withdrawal</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedWithdrawal.customer_name}</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant={processForm.approved ? 'default' : 'outline'}
                    onClick={() => setProcessForm({ ...processForm, approved: true })}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />Approve
                  </Button>
                  <Button
                    variant={!processForm.approved ? 'destructive' : 'outline'}
                    onClick={() => setProcessForm({ ...processForm, approved: false })}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />Reject
                  </Button>
                </div>
                {processForm.approved ? (
                  <div>
                    <Label>Transaction Reference</Label>
                    <Input
                      value={processForm.transaction_reference}
                      onChange={(e) => setProcessForm({ ...processForm, transaction_reference: e.target.value })}
                      placeholder="Bank transaction ID"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={processForm.rejection_reason}
                      onChange={(e) => setProcessForm({ ...processForm, rejection_reason: e.target.value })}
                      placeholder="Reason for rejection"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProcessDialog(false)}>Cancel</Button>
              <Button
                onClick={handleProcessWithdrawal}
                disabled={loading}
                className={processForm.approved ? '' : 'bg-red-600 hover:bg-red-700'}
                data-testid="process-withdrawal-btn"
              >
                {loading ? 'Processing...' : processForm.approved ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReferralWalletManagement;
