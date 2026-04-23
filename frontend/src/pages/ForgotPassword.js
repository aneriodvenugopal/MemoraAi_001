import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Phone, KeyRound, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Verify OTP, 3: New password
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  
  const navigate = useNavigate();

  const validatePhone = (value) => {
    if (!value) return 'Phone number is required';
    if (!/^\d{10}$/.test(value)) return 'Phone number must be 10 digits';
    return '';
  };

  const validateOTP = (value) => {
    if (!value) return 'OTP is required';
    if (!/^\d{6}$/.test(value)) return 'OTP must be 6 digits';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain at least one special character';
    return '';
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { score, text: 'Weak', color: 'red' };
    if (score <= 4) return { score, text: 'Medium', color: 'yellow' };
    return { score, text: 'Strong', color: 'green' };
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetToken(data.reset_token);
        toast.success(`OTP sent to ${phone}! (Dev: ${data.otp})`);
        setStep(2);
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const otpError = validateOTP(otp);
    if (otpError) {
      setErrors({ otp: otpError });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, reset_token: resetToken })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('OTP verified! Set your new password.');
        setStep(3);
      } else {
        toast.error(data.detail || 'Invalid OTP');
      }
    } catch (error) {
      toast.error('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          otp,
          reset_token: resetToken,
          new_password: newPassword 
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Password reset successfully! Please login.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(data.detail || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Error resetting password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (value) => {
    setNewPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
    if (errors.password) setErrors({ ...errors, password: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-blue-200 relative z-10 bg-white/95 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-base mt-2 text-gray-600">
              {step === 1 && 'Enter your phone number to receive OTP'}
              {step === 2 && 'Enter the OTP sent to your phone'}
              {step === 3 && 'Create a new strong password'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
          </div>

          {/* Step 1: Enter Phone Number */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  maxLength={10}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending OTP...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-5 h-5" />
                    Send OTP
                  </div>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✓ OTP sent to {phone}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Enter OTP
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (errors.otp) setErrors({ ...errors, otp: '' });
                  }}
                  maxLength={6}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-center text-2xl tracking-widest"
                />
                {errors.otp && (
                  <p className="text-sm text-red-500">{errors.otp}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Verify OTP
                  </div>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  🔒 New Password
                </label>
                <Input
                  type="password"
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.color === 'red' ? 'bg-red-500 w-1/3' :
                            passwordStrength.color === 'yellow' ? 'bg-blue-500 w-2/3' :
                            'bg-green-500 w-full'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.color === 'red' ? 'text-red-600' :
                        passwordStrength.color === 'yellow' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
                <p className="text-xs text-gray-500">
                  Must be 8+ characters with uppercase, lowercase, number & special character
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  🔒 Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                  }}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <span className="text-xs">✓</span> Passwords match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Resetting Password...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Reset Password
                  </div>
                )}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="text-center pt-4 border-t border-gray-200">
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
