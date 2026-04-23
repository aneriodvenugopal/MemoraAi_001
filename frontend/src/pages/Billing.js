import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  CreditCard, Check, X, Zap, Building2, Users, Home, MessageSquare, Mail, 
  ChevronLeft, RefreshCw, Calendar, FileText, AlertTriangle, Crown, Rocket, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Billing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [processingPackage, setProcessingPackage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [packagesRes, subscriptionRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/api/subscriptions/packages`),
        fetch(`${API_URL}/api/subscriptions/current`, { headers }),
        fetch(`${API_URL}/api/subscriptions/invoices`, { headers })
      ]);
      
      const [packagesData, subscriptionData, invoicesData] = await Promise.all([
        packagesRes.json(),
        subscriptionRes.ok ? subscriptionRes.json() : null,
        invoicesRes.ok ? invoicesRes.json() : { invoices: [] }
      ]);
      
      setPackages(packagesData.packages || []);
      setCurrentSubscription(subscriptionData);
      setInvoices(invoicesData.invoices || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    }
    setLoading(false);
  };

  const handleSubscribe = async (packageId, billingCycle = 'monthly') => {
    setProcessingPackage(packageId);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          package_id: packageId,
          billing_cycle: billingCycle,
          origin_url: window.location.origin
        })
      });
      
      const data = await res.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.detail || 'Failed to create checkout');
      }
    } catch (error) {
      toast.error(error.message);
    }
    setProcessingPackage(null);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Subscription will be cancelled at the end of your billing period');
        fetchData();
      } else {
        throw new Error(data.detail || 'Failed to cancel subscription');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Subscription reactivated!');
        fetchData();
      } else {
        throw new Error(data.detail || 'Failed to reactivate');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getPackageIcon = (packageId) => {
    switch (packageId) {
      case 'starter': return <Rocket className="w-6 h-6" />;
      case 'pro': return <Star className="w-6 h-6" />;
      case 'enterprise': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getPackageColor = (packageId) => {
    switch (packageId) {
      case 'starter': return 'from-blue-500 to-cyan-500';
      case 'pro': return 'from-purple-500 to-pink-500';
      case 'enterprise': return 'from-sky-500 to-orange-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" data-testid="billing-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="billing-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-lg">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Billing & Subscription</h1>
                <p className="text-indigo-100">Manage your subscription and view invoices</p>
              </div>
            </div>
            <Button onClick={fetchData} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Current Subscription Status */}
        {currentSubscription && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${getPackageColor(currentSubscription.subscription?.package_id)}`}>
                    {getPackageIcon(currentSubscription.subscription?.package_id)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {currentSubscription.package?.name || 'Free'} Plan
                    </CardTitle>
                    <CardDescription>
                      {currentSubscription.subscription?.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {currentSubscription.subscription?.cancel_at_period_end && (
                        <Badge variant="destructive" className="ml-2">Cancelling</Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(currentSubscription.package?.monthly_price || 0)}
                    <span className="text-sm font-normal text-slate-500">/mo</span>
                  </p>
                  {currentSubscription.subscription?.current_period_end && (
                    <p className="text-sm text-slate-500">
                      Renews {new Date(currentSubscription.subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Usage Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> Projects
                    </span>
                    <span className="text-sm font-medium">
                      {currentSubscription.usage?.projects?.used}/{currentSubscription.usage?.projects?.unlimited ? '∞' : currentSubscription.usage?.projects?.limit}
                    </span>
                  </div>
                  <Progress 
                    value={currentSubscription.usage?.projects?.unlimited ? 0 : getUsagePercentage(currentSubscription.usage?.projects?.used, currentSubscription.usage?.projects?.limit)} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Users
                    </span>
                    <span className="text-sm font-medium">
                      {currentSubscription.usage?.users?.used}/{currentSubscription.usage?.users?.unlimited ? '∞' : currentSubscription.usage?.users?.limit}
                    </span>
                  </div>
                  <Progress 
                    value={currentSubscription.usage?.users?.unlimited ? 0 : getUsagePercentage(currentSubscription.usage?.users?.used, currentSubscription.usage?.users?.limit)} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> SMS
                    </span>
                    <span className="text-sm font-medium">
                      {currentSubscription.credits?.sms?.remaining} remaining
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(currentSubscription.credits?.sms?.remaining, currentSubscription.credits?.sms?.monthly_allocation)} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" /> Email
                    </span>
                    <span className="text-sm font-medium">
                      {currentSubscription.credits?.email?.remaining} remaining
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(currentSubscription.credits?.email?.remaining, currentSubscription.credits?.email?.monthly_allocation)} 
                    className="h-2"
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                {currentSubscription.subscription?.cancel_at_period_end ? (
                  <Button onClick={handleReactivate} className="bg-green-600 hover:bg-green-700">
                    Reactivate Subscription
                  </Button>
                ) : currentSubscription.subscription?.status === 'active' && (
                  <Button variant="outline" onClick={handleCancelSubscription} className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans" data-testid="tab-plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isCurrentPlan = currentSubscription?.subscription?.package_id === pkg.id;
                
                return (
                  <Card 
                    key={pkg.id} 
                    className={`relative overflow-hidden ${isCurrentPlan ? 'ring-2 ring-indigo-500' : ''}`}
                    data-testid={`package-${pkg.id}`}
                  >
                    {isCurrentPlan && (
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                        Current Plan
                      </div>
                    )}
                    {pkg.id === 'pro' && (
                      <div className="absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-br-lg">
                        Most Popular
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getPackageColor(pkg.id)} flex items-center justify-center text-white mb-3`}>
                        {getPackageIcon(pkg.id)}
                      </div>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-slate-900">{formatCurrency(pkg.monthly_price)}</span>
                          <span className="text-slate-500 ml-1">/month</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          or {formatCurrency(pkg.yearly_price)}/year (Save {formatCurrency(pkg.savings_yearly)})
                        </p>
                      </div>
                      
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {pkg.features.max_projects === -1 ? 'Unlimited' : pkg.features.max_projects} Projects
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {pkg.features.max_users === -1 ? 'Unlimited' : pkg.features.max_users} Users
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {pkg.features.max_properties === -1 ? 'Unlimited' : pkg.features.max_properties} Properties
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {pkg.features.sms_credits} SMS/month
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          {pkg.features.email_credits} Emails/month
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {pkg.features.whatsapp_enabled ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300" />
                          )}
                          <span className={!pkg.features.whatsapp_enabled ? 'text-slate-400' : ''}>
                            WhatsApp Integration
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {pkg.features.ai_features ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300" />
                          )}
                          <span className={!pkg.features.ai_features ? 'text-slate-400' : ''}>
                            AI Features
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          {pkg.features.priority_support ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300" />
                          )}
                          <span className={!pkg.features.priority_support ? 'text-slate-400' : ''}>
                            Priority Support
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                    
                    <CardFooter className="flex flex-col gap-2">
                      <Button 
                        className={`w-full ${pkg.id === 'pro' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : ''}`}
                        onClick={() => handleSubscribe(pkg.id, 'monthly')}
                        disabled={isCurrentPlan || processingPackage === pkg.id}
                        data-testid={`subscribe-${pkg.id}-monthly`}
                      >
                        {processingPackage === pkg.id ? 'Processing...' : isCurrentPlan ? 'Current Plan' : 'Subscribe Monthly'}
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSubscribe(pkg.id, 'yearly')}
                        disabled={isCurrentPlan || processingPackage === pkg.id}
                        data-testid={`subscribe-${pkg.id}-yearly`}
                      >
                        Subscribe Yearly (Save 17%)
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice History
                </CardTitle>
                <CardDescription>Your past payments and invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No invoices yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <FileText className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{invoice.package_name} - {invoice.billing_cycle}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</p>
                          <Badge className={invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-700'}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Billing;
