import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && token) {
      pollSubscriptionStatus();
    }
  }, [sessionId, token]);

  const pollSubscriptionStatus = async () => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/checkout/status/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        setStatus('success');
        setSubscriptionInfo(data);
        return;
      } else if (data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollSubscriptionStatus, pollInterval);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setAttempts(prev => prev + 1);
      setTimeout(pollSubscriptionStatus, pollInterval);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount / 100); // Stripe returns amount in smallest currency unit
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4" data-testid="subscription-success-page">
      <Card className="w-full max-w-md">
        {status === 'checking' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <CardTitle>Processing Your Subscription</CardTitle>
              <CardDescription>Please wait while we confirm your payment...</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-500">
                This may take a few moments. Please don't close this page.
              </p>
            </CardContent>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-green-700">Subscription Activated!</CardTitle>
              <CardDescription>Welcome to {subscriptionInfo?.package_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Plan</span>
                  <span className="font-medium">{subscriptionInfo?.package_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount</span>
                  <span className="font-medium">{formatCurrency(subscriptionInfo?.amount)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/billing')} className="w-full">
                  View Billing Details
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {(status === 'failed' || status === 'timeout') && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-red-700">
                {status === 'timeout' ? 'Verification Timeout' : 'Subscription Failed'}
              </CardTitle>
              <CardDescription>
                {status === 'timeout' 
                  ? 'We couldn\'t verify your payment. Please check your email for confirmation.'
                  : 'There was an issue processing your subscription.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => navigate('/billing')} className="w-full">
                Return to Billing
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
