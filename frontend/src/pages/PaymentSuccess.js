import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle, Home, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, failed, error
  const [paymentData, setPaymentData] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 5;
  const pollInterval = 2000;

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= maxAttempts) {
      setStatus('error');
      toast.error('Payment status check timed out. Please check your email for confirmation.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments/checkout/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();
      setPaymentData(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment successful!');
        return;
      } else if (data.status === 'expired') {
        setStatus('failed');
        toast.error('Payment session expired.');
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    }
  };

  const formatAmount = (amount, currency) => {
    if (!amount) return '₹0';
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'INR',
      maximumFractionDigits: 0
    });
    // Stripe returns amount in smallest currency unit (paise for INR)
    return formatter.format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          {status === 'checking' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Verifying Payment</CardTitle>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-700">Payment Failed</CardTitle>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-700">Status Unknown</CardTitle>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'checking' && (
            <div className="text-center">
              <p className="text-gray-600">Please wait while we verify your payment...</p>
              <p className="text-sm text-gray-400 mt-2">Attempt {attempts + 1} of {maxAttempts}</p>
            </div>
          )}

          {status === 'success' && paymentData && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-bold text-green-700">
                    {formatAmount(paymentData.amount_total, paymentData.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID</span>
                  <span className="font-mono text-sm">{paymentData.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="text-green-600 font-medium">Completed</span>
                </div>
              </div>

              <p className="text-center text-gray-600 text-sm">
                A confirmation email will be sent to your registered email address.
              </p>

              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600"
                  onClick={() => navigate('/dashboard')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/payments')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Payments
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                Your payment session has expired or was cancelled. No amount has been charged.
              </p>
              <div className="flex gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => navigate(-1)}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/dashboard')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                We couldn't verify your payment status. Please check your email for confirmation or contact support.
              </p>
              <div className="flex gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setAttempts(0);
                    setStatus('checking');
                    pollPaymentStatus();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/dashboard')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
