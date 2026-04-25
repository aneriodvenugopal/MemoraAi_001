import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { Phone, KeyRound, Loader2, ArrowRight, RefreshCw, Lock, Mail } from 'lucide-react';
import MemoraAILogo from '../components/MemoraAILogo';

const Login = () => {
  // Login method: 'otp' or 'password'
  const [loginMethod, setLoginMethod] = useState('otp');
  
  // OTP States
  const [step, setStep] = useState(1); // 1: Enter Mobile, 2: Enter OTP
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [devOTP, setDevOTP] = useState('');
  
  // Password States
  const [identifier, setIdentifier] = useState(''); // Phone or Email
  const [password, setPassword] = useState('');
  
  // Common States
  const [loading, setLoading] = useState(false);
  
  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();

  // Validate mobile number (10 digits)
  const isValidMobile = (num) => /^[6-9]\d{9}$/.test(num);
  
  // Check if identifier is email or phone
  const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  // Handle Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!isValidMobile(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.sendOTP(mobile);
      
      if (response.otp) {
        setDevOTP(response.otp);
        toast.success(`OTP sent! Dev OTP: ${response.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your mobile number');
      }
      
      setStep(2);
      startResendTimer();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP & Login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOTP(mobile, otp);
      
      // Check if it's a customer login (session-based)
      if (response.account_type === 'customer') {
        localStorage.setItem('customerPortalSession', JSON.stringify({
          token: response.session_id || response.access_token,
          customer: response.user,
          phone: mobile
        }));
        localStorage.setItem('token', response.session_id || response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success(`Welcome, ${response.user.name}!`);
        navigate('/customer-dashboard');
      } else if (response.access_token) {
        // Regular user login (JWT-based)
        await loginWithPassword(response.access_token, response.user, true);
        toast.success(`Welcome, ${response.user.name}!`);
        redirectBasedOnRole(response.user.role);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error('Please enter phone number or email');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Please enter password');
      return;
    }

    setLoading(true);
    try {
      // Format identifier for API
      let loginIdentifier = identifier.trim();
      
      // If it's a 10-digit number, it's a phone
      if (/^\d{10}$/.test(loginIdentifier)) {
        loginIdentifier = loginIdentifier; // Keep as is
      }
      
      // Determine if identifier is email or phone
      const isPhoneNumber = /^\d{10}$/.test(loginIdentifier);
      const credentials = isPhoneNumber 
        ? { phone: loginIdentifier, password: password }
        : { email: loginIdentifier, password: password };
      
      const response = await authService.loginWithPassword(credentials);
      
      if (response.access_token) {
        await loginWithPassword(response.access_token, response.user, true);
        toast.success(`Welcome back, ${response.user.name}!`);
        redirectBasedOnRole(response.user.role);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Invalid credentials';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Redirect based on user role
  const redirectBasedOnRole = (role) => {
    if (role === 'super_admin') {
      navigate('/saas-admin');  // SaaS admin lands on the admin dashboard
    } else if (role === 'customer') {
      navigate('/customer-dashboard');
    } else {
      // Tenant admin + staff → premium Own Business GPT with sidebar
      navigate('/own-business-gpt');
    }
  };

  // Resend OTP timer
  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const response = await authService.sendOTP(mobile);
      if (response.otp) {
        setDevOTP(response.otp);
        toast.success(`OTP resent! Dev OTP: ${response.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP resent successfully');
      }
      startResendTimer();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // Switch login method
  const switchToPassword = () => {
    setLoginMethod('password');
    setStep(1);
    setOtp('');
    setDevOTP('');
  };

  const switchToOTP = () => {
    setLoginMethod('otp');
    setIdentifier('');
    setPassword('');
  };

  // Go back to mobile input
  const handleBack = () => {
    setStep(1);
    setOtp('');
    setDevOTP('');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sky-50 via-blue-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-blue-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-orange-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Premium hero panel — desktop only */}
      <aside className="hidden lg:flex flex-col justify-between w-1/2 xl:w-[55%] p-12 relative z-10 bg-gradient-to-br from-gray-900 via-gray-900 to-sky-950 text-white">
        <div>
          <div className="flex items-center mb-12">
            <MemoraAILogo size="lg" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            Your AI sales<br />agent that <span className="text-sky-400">never sleeps</span>.
          </h1>
          <p className="text-gray-300 text-base max-w-md leading-relaxed">
            WhatsApp automation with AI memory for real estate, clinics, astrology, salons and more — built for Indian businesses.
          </p>
        </div>

        <ul className="space-y-4 max-w-md">
          {[
            { t: 'Industry-aware AI', d: '16+ categories with dynamic replies & pricing' },
            { t: 'RAG Memory Engine', d: 'Remembers every customer conversation forever' },
            { t: 'Human handover', d: 'Live team inbox with AI suggestions' },
          ].map((b, i) => (
            <li key={i} className="flex items-start gap-3" data-testid={`hero-benefit-${i}`}>
              <div className="w-7 h-7 rounded-lg bg-sky-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-white">{b.t}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{b.d}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex -space-x-2">
            {['bg-sky-400', 'bg-orange-400', 'bg-blue-400'].map((c, i) => (
              <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-gray-900`} />
            ))}
          </div>
          <span>Trusted by growing Indian businesses</span>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <MemoraAILogo size="lg" />
            </div>
            <div className="hidden lg:block pt-4">
              <span className="text-[10px] uppercase tracking-widest text-sky-600 font-bold">MemoraAI</span>
            </div>
          </CardHeader>

        <CardContent className="space-y-6">
          {loginMethod === 'otp' ? (
            /* OTP Login Flow */
            <>
              {step === 1 ? (
                /* Step 1: Enter Mobile Number */
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Welcome Back</h2>
                    <p className="text-gray-500 text-sm mt-1">Enter your mobile number to continue</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500">
                        <span className="text-sm font-medium">+91</span>
                        <div className="w-px h-5 bg-gray-300"></div>
                      </div>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        autoComplete="tel"
                        placeholder="Enter 10-digit mobile"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-16 h-12 text-lg tracking-wide"
                        maxLength={10}
                        autoFocus
                        required
                        aria-label="Mobile number"
                        data-testid="mobile-input"
                      />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold text-base shadow-md shadow-sky-500/20"
                    disabled={loading || mobile.length !== 10}
                    data-testid="send-otp-btn"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Get OTP
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Switch to Password Login */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={switchToPassword}
                      className="text-sm text-sky-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                    >
                      <Lock className="w-4 h-4" />
                      Can't receive OTP? Login with Password
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Enter OTP */
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Verify OTP</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Enter the 6-digit code sent to
                      <br />
                      <span className="font-semibold text-gray-700">+91 {mobile}</span>
                      <button
                        type="button"
                        onClick={handleBack}
                        className="text-sky-600 hover:underline ml-2 text-xs"
                      >
                        Change
                      </button>
                    </p>
                  </div>

                  {/* Dev OTP Display */}
                  {devOTP && (
                    <div className="bg-gray-900 rounded-xl p-3 text-center" data-testid="dev-otp-box">
                      <p className="text-[10px] text-sky-300 uppercase tracking-widest font-semibold mb-1">Dev Mode OTP</p>
                      <p className="text-2xl font-bold text-white tracking-widest font-mono">{devOTP}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700" id="otp-label">Enter OTP</label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        autoComplete="one-time-code"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-14 text-center text-2xl tracking-[0.5em] font-semibold"
                        maxLength={6}
                        autoFocus
                        required
                        aria-labelledby="otp-label"
                        aria-describedby="otp-hint"
                        data-testid="otp-input"
                      />
                      <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <p id="otp-hint" className="sr-only">Enter the 6-digit verification code sent to your mobile</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold text-base shadow-md shadow-sky-500/20"
                    disabled={loading || otp.length !== 6}
                    data-testid="verify-otp-btn"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Verify & Login'
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || loading}
                      className={`${resendTimer > 0 ? 'text-gray-400' : 'text-sky-600 hover:underline'}`}
                    >
                      {resendTimer > 0 ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-4 h-4" />
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-4 h-4" />
                          Resend OTP
                        </span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={switchToPassword}
                      className="text-gray-500 hover:text-sky-600"
                    >
                      Use Password
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Password Login Flow */
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Login with Password</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your phone number or email</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="identifier-input">Phone Number or Email</label>
                  <div className="relative">
                    <Input
                      id="identifier-input"
                      type={isEmail(identifier) ? 'email' : 'tel'}
                      inputMode={isEmail(identifier) ? 'email' : 'tel'}
                      autoComplete={isEmail(identifier) ? 'email' : 'tel'}
                      placeholder="Enter phone or email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="h-12 pl-10"
                      autoFocus
                      required
                      aria-label="Phone number or email address"
                      data-testid="identifier-input"
                    />
                    {isEmail(identifier) ? (
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="password-input">Password</label>
                  <div className="relative">
                    <Input
                      id="password-input"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-10"
                      required
                      aria-label="Password"
                      data-testid="password-input"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-semibold text-base shadow-md shadow-sky-500/20"
                disabled={loading || !identifier.trim() || !password.trim()}
                data-testid="password-login-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Login
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Switch to OTP Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={switchToOTP}
                  className="text-sm text-sky-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <Phone className="w-4 h-4" />
                  Login with OTP instead
                </button>
              </div>
            </form>
          )}

          {/* Terms */}
          <p className="text-center text-xs text-gray-500 pt-2">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-sky-600 hover:underline">Terms</Link>
            {' & '}
            <Link to="/privacy" className="text-sky-600 hover:underline">Privacy Policy</Link>
          </p>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-400">
              Secure login powered by MemoraAI
            </p>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default Login;
