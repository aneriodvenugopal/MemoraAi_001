import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StripePayments = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch transactions and stats in parallel
      const [transactionsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/payments/transactions${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`, { headers }),
        fetch(`${API_URL}/api/payments/stats`, { headers })
      ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async (sessionId) => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments/checkout/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Payment status updated');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
  };

  const formatAmount = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, paymentStatus) => {
    if (paymentStatus === 'paid') {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    }
    if (status === 'expired') {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    if (status === 'pending' || paymentStatus === 'initiated') {
      return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  const filteredTransactions = transactions.filter(txn => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      txn.id?.toLowerCase().includes(search) ||
      txn.stripe_session_id?.toLowerCase().includes(search) ||
      txn.package_name?.toLowerCase().includes(search) ||
      txn.description?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6" data-testid="stripe-payments-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Stripe Payments
          </h1>
          <p className="text-gray-500 mt-1">Manage and track all payment transactions</p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Total Collected</p>
                    <p className="text-2xl font-bold text-green-800">{formatAmount(stats.total_collected)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Completed</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700">Failed/Expired</p>
                    <p className="text-2xl font-bold text-red-800">{stats.failed}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by transaction ID, package, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            <CardDescription>All Stripe payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(txn.status, txn.payment_status)}
                          <span className="font-medium text-gray-900">{txn.package_name}</span>
                        </div>
                        <p className="text-sm text-gray-500 font-mono">{txn.id}</p>
                        {txn.description && (
                          <p className="text-sm text-gray-600 mt-1">{txn.description}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatAmount(txn.amount, txn.currency)}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(txn.created_at)}</p>
                      </div>

                      <div className="flex gap-2">
                        {(txn.status === 'pending' || txn.payment_status === 'initiated') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => refreshStatus(txn.stripe_session_id)}
                            disabled={refreshing}
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-4 text-sm text-gray-500">
                      {txn.booking_id && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">Booking:</span>
                          {txn.booking_id}
                        </span>
                      )}
                      {txn.customer_id && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">Customer:</span>
                          {txn.customer_id}
                        </span>
                      )}
                      {txn.project_id && (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">Project:</span>
                          {txn.project_id}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default StripePayments;
