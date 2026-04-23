import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, RefreshCw } from 'lucide-react';

const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700">Payment Cancelled</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Your payment was cancelled. No amount has been charged to your account.
            </p>
            <p className="text-sm text-gray-400">
              If you experienced any issues, please try again or contact our support team.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
              onClick={() => navigate(-1)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
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

          <div className="text-center">
            <p className="text-xs text-gray-400">
              Need help? Contact support at support@memoraai.in
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelled;
