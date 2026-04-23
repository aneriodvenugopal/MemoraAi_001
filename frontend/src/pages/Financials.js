import React, { useState, useEffect } from 'react';
import { financialService, projectService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Plus, Calendar, CreditCard, Filter, Download, Receipt
} from 'lucide-react';
import { toast } from 'sonner';

const Financials = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    type: 'receivable',
    category: '',
    from_party: '',
    to_party: '',
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const tenantId = user.tenant_id;

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectId = selectedProject === 'all' ? null : selectedProject;

      const [summaryData, transactionsData, categoriesData, projectsData] = await Promise.all([
        financialService.getFinancialSummary(projectId),
        financialService.getTransactions({ project_id: projectId, limit: 50 }),
        financialService.getExpenseCategories(),
        projectService.getAll(tenantId),
      ]);

      setSummary(summaryData.summary || {});
      setTransactions(transactionsData.transactions || []);
      setCategories(categoriesData.categories || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Failed to load financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.payment_date) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedProject === 'all') {
      toast.error('Please select a specific project');
      return;
    }

    try {
      setSubmitting(true);
      await financialService.createTransaction({
        project_id: selectedProject,
        tenant_id: tenantId,
        type: transactionForm.type,
        category: transactionForm.category || null,
        from_party: transactionForm.from_party || null,
        to_party: transactionForm.to_party || null,
        amount: parseFloat(transactionForm.amount),
        currency_id: 'INR',
        payment_method: transactionForm.payment_method,
        payment_date: new Date(transactionForm.payment_date).toISOString(),
        description: transactionForm.description || null,
        notes: transactionForm.notes || null,
      });

      toast.success('Transaction recorded successfully');
      setShowAddTransaction(false);
      setTransactionForm({
        type: 'receivable',
        category: '',
        from_party: '',
        to_party: '',
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error(error.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💵',
      bank_transfer: '🏦',
      cheque: '📝',
      upi: '📱',
      online: '💳',
    };
    return icons[method] || '💰';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
            Financial Management
          </h1>
          <p className="text-gray-600 mt-1">Track payments, expenses, and financial reports</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
            <DialogTrigger asChild>
              <Button className="bg-ocean-primary hover:bg-ocean-secondary" disabled={selectedProject === 'all'}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transaction Type *</Label>
                    <Select 
                      value={transactionForm.type} 
                      onValueChange={(val) => setTransactionForm({ ...transactionForm, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receivable">💰 Income/Receivable</SelectItem>
                        <SelectItem value="payment">💸 Expense/Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                {transactionForm.type === 'payment' && (
                  <div>
                    <Label>Expense Category</Label>
                    <Select 
                      value={transactionForm.category} 
                      onValueChange={(val) => setTransactionForm({ ...transactionForm, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{transactionForm.type === 'receivable' ? 'From Party' : 'To Party'}</Label>
                    <Input
                      placeholder={transactionForm.type === 'receivable' ? 'Customer name' : 'Vendor/Staff name'}
                      value={transactionForm.type === 'receivable' ? transactionForm.from_party : transactionForm.to_party}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        [transactionForm.type === 'receivable' ? 'from_party' : 'to_party']: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>Payment Method *</Label>
                    <Select 
                      value={transactionForm.payment_method} 
                      onValueChange={(val) => setTransactionForm({ ...transactionForm, payment_method: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                        <SelectItem value="cheque">📝 Cheque</SelectItem>
                        <SelectItem value="upi">📱 UPI</SelectItem>
                        <SelectItem value="online">💳 Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={transactionForm.payment_date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, payment_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    placeholder="Additional notes"
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddTransaction(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddTransaction} 
                  disabled={submitting || !transactionForm.amount}
                  className="bg-ocean-primary hover:bg-ocean-secondary"
                >
                  {submitting ? 'Recording...' : 'Record Transaction'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {formatCurrency(summary.total_income)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.receivables_count || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      {formatCurrency(summary.total_expenses)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.payments_count || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Profit</p>
                    <p className={`text-2xl font-bold mt-2 ${summary.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.net_profit)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.net_profit >= 0 ? 'Profit' : 'Loss'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commissions</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      {formatCurrency(summary.total_commissions)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown */}
          {summary.expense_breakdown && Object.keys(summary.expense_breakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summary.expense_breakdown).map(([category, amount]) => {
                    const percentage = ((amount / summary.total_expenses) * 100).toFixed(1);
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{category.replace('_', ' ')}</span>
                          <span className="text-gray-600">
                            {formatCurrency(amount)} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-ocean-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-gray-500 mb-4">Start recording your financial transactions</p>
                  <Button 
                    onClick={() => setShowAddTransaction(true)}
                    className="bg-ocean-primary hover:bg-ocean-secondary"
                    disabled={selectedProject === 'all'}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <Card key={transaction.id} className="border border-gray-200 hover:border-ocean-primary/30 transition">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl mt-1">
                              {transaction.type === 'receivable' ? <ArrowUpRight className="w-6 h-6 text-green-600" /> : <ArrowDownRight className="w-6 h-6 text-red-600" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{transaction.transaction_number}</h4>
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {transaction.description || 
                                  (transaction.type === 'receivable' 
                                    ? `Payment from ${transaction.from_party || 'Customer'}`
                                    : `Payment to ${transaction.to_party || 'Vendor'}`
                                  )
                                }
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">
                                  {getPaymentMethodIcon(transaction.payment_method)} {transaction.payment_method.replace('_', ' ')}
                                </Badge>
                                {transaction.category && (
                                  <Badge variant="outline" className="capitalize">
                                    {transaction.category.replace('_', ' ')}
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(transaction.payment_date)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${transaction.type === 'receivable' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'receivable' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financials;
