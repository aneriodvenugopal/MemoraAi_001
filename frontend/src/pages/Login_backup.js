import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generatedOtp, setGeneratedOtp] = useState(''); // Store OTP for display
  const { login } = useAuth();
  const navigate = useNavigate();

  const validatePhone = (value) => {
    if (!value || value.trim() === '') {
      return 'Phone number is required';
    }
    if (!/^[0-9]{10}$/.test(value)) {
      return 'Please enter a valid 10-digit phone number';
    }
    return '';
  };

  const validateOTP = (value) => {
    if (!value || value.trim() === '') {
      return 'OTP is required';
    }
    if (!/^[0-9]{6}$/.test(value)) {
      return 'Please enter a valid 6-digit OTP';
    }
    return '';
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Validate phone
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const result = await authService.sendOTP(phone);
      
      // Store the OTP for display in development mode
      if (result.otp) {
        setGeneratedOtp(result.otp);
      }
      
      toast.success('OTP sent successfully!', {
        style: {
          background: '#10b981',
          color: 'white',
        },
      });
      setStep('otp');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to send OTP';
      toast.error(errorMsg, {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    // Validate OTP
    const otpError = validateOTP(otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      await login(phone, otp);
      toast.success('Login successful!', {
        style: {
          background: '#10b981',
          color: 'white',
        },
      });
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Invalid OTP';
      toast.error(errorMsg, {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">MemoraAI</CardTitle>
          <CardDescription className="text-center">
            Real Estate Automation Software
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({});
                  }}
                  onBlur={(e) => {
                    const error = validatePhone(e.target.value);
                    if (error) setErrors({ phone: error });
                  }}
                  maxLength={10}
                  className={`w-full ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link to="/register" className="text-blue-600 hover:underline font-medium">
                  Register here
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {/* Development Mode: Show OTP */}
              {generatedOtp && (
                <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-700 font-semibold">🔧 Development Mode</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    Your OTP (in production, this will be sent via SMS):
                  </p>
                  <div className="bg-white border-2 border-blue-400 rounded p-3 text-center">
                    <span className="text-3xl font-bold text-blue-700 tracking-wider">
                      {generatedOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(generatedOtp);
                      navigator.clipboard.writeText(generatedOtp);
                      toast.success('OTP copied to clipboard!');
                    }}
                    className="mt-2 text-sm text-blue-700 underline hover:text-blue-900"
                  >
                    Click to auto-fill OTP
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Enter OTP</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (errors.otp) setErrors({});
                  }}
                  onBlur={(e) => {
                    const error = validateOTP(e.target.value);
                    if (error) setErrors({ otp: error });
                  }}
                  maxLength={6}
                  className={`w-full text-center text-2xl tracking-widest ${
                    errors.otp ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.otp && (
                  <p className="text-sm text-red-500 mt-1 text-center">{errors.otp}</p>
                )}
                <p className="text-xs text-gray-500 text-center">
                  OTP sent to {phone}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setGeneratedOtp('');
                    setErrors({});
                  }}
                >
                  Change Number
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
