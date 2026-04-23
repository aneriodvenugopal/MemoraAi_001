import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import { toast } from 'sonner';

const PWALogin = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOTP] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [devOTP, setDevOTP] = useState(''); // Store OTP for display
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in - check both token keys for compatibility
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      navigate('/pwa/dashboard');
    }

    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [navigate]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!phone || phone.length !== 10) {
      toast.error('Please enter valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.sendOTP(phone);
      
      // Store and show OTP in development
      if (response.otp) {
        setDevOTP(response.otp);
        toast.success(`OTP sent! Dev OTP: ${response.otp}`, {
          duration: 10000,
          style: {
            background: '#10b981',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        });
      } else {
        toast.success('OTP sent successfully!');
      }
      
      setStep(2);
      setTimer(60); // 60 seconds resend timer
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOTP(phone, otp);
      
      // Store auth data - use both keys for compatibility with main app and PWA
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('user_id', response.user.id);
      localStorage.setItem('login_timestamp', new Date().toISOString());
      
      // Register for push notifications
      registerPushNotifications();
      
      toast.success(`Welcome ${response.user.name}!`);
      
      // Navigate to dashboard
      navigate('/pwa/dashboard');
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const registerPushNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Subscribe to push notifications
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
            )
          });
          
          // Send subscription to server
          // await notificationService.subscribeToPush(subscription);
          console.log('Push notification subscribed:', subscription);
        }
      }
    } catch (error) {
      console.error('Push notification registration failed:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    
    setLoading(true);
    try {
      await authService.sendOTP(phone);
      toast.success('OTP resent successfully!');
      setTimer(60);
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pwa-login min-h-screen bg-gradient-to-br from-ocean-primary via-ocean-secondary to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl mx-auto flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-ocean-primary">R</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MemoraAI</h1>
          <p className="text-white/80">Real Estate Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-ocean-primary focus:outline-none text-lg"
                    maxLength="10"
                    autoFocus
                    required
                    aria-label="Mobile number"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send OTP"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-ocean-primary font-semibold mb-4 flex items-center"
                aria-label="Go back and change phone number"
              >
                ← Change Number
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h2>
              <p className="text-gray-600 mb-2">
                Enter the OTP sent to +91 {phone}
              </p>
              
              {/* Show OTP in Development */}
              {devOTP && (
                <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-xl" role="alert">
                  <p className="text-sm text-green-800 font-semibold mb-1">
                    🔓 Development Mode - OTP:
                  </p>
                  <p className="text-3xl font-bold text-green-900 text-center tracking-wider">
                    {devOTP}
                  </p>
                </div>
              )}
              
              <div className="mb-6">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-ocean-primary focus:outline-none text-center text-2xl font-bold tracking-widest"
                  maxLength="6"
                  autoFocus
                  required
                  aria-label="Enter 6-digit OTP"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                aria-label="Verify OTP and login"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-gray-600">
                    Resend OTP in <span className="font-bold text-ocean-primary">{timer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-ocean-primary font-semibold hover:underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          By logging in, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default PWALogin;
