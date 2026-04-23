import React, { useState, useEffect } from 'react';
import { authService } from '../services';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Waves, UserPlus, Phone, Mail, User, Briefcase } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role_id: ''
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await authService.getRoles();
      // Backend returns array directly, not wrapped in object
      const allRoles = Array.isArray(data) ? data : data.roles || [];
      
      // For public registration, only show Tenant Admin role
      // Super Admin and other roles should be created by admins only
      const publicRoles = allRoles.filter(role => 
        role.slug === 'tenant_admin' || role.slug === 'customer'
      );
      
      setRoles(publicRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const validateName = (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    return '';
  };

  const validateEmail = (value) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    return '';
  };

  const validatePhone = (value) => {
    if (!value) return 'Phone number is required';
    if (!/^\d{10}$/.test(value)) return 'Phone number must be 10 digits';
    return '';
  };

  const validateRole = (value) => {
    if (!value) return 'Please select a role';
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

  const validateConfirmPassword = (value) => {
    if (!value) return 'Please confirm your password';
    if (value !== formData.password) return 'Passwords do not match';
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

  const handlePasswordChange = (value) => {
    setFormData({ ...formData, password: value });
    setPasswordStrength(checkPasswordStrength(value));
    if (errors.password) setErrors({ ...errors, password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword),
      role_id: validateRole(formData.role_id)
    };

    const hasErrors = Object.values(newErrors).some(error => error !== '');
    setErrors(newErrors);

    if (hasErrors) {
      toast.error('Please fix all errors');
      return;
    }

    setLoading(true);
    try {
      // Remove confirmPassword before sending
      const { confirmPassword, ...registrationData } = formData;
      await authService.register(registrationData);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="w-full max-w-md glass-card-dark border-ocean-primary/20 relative z-10">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ocean-primary to-ocean-secondary flex items-center justify-center shadow-lg">
              <Waves className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Join MemoraAI today
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-ocean-primary" />
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => {
                  const error = validateName(formData.name);
                  if (error) setErrors({ ...errors, name: error });
                }}
                className={`glass-input ${errors.name ? 'border-red-500' : 'border-ocean-primary/30'}`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-ocean-primary" />
                Email
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => {
                  const error = validateEmail(formData.email);
                  if (error) setErrors({ ...errors, email: error });
                }}
                className={`glass-input ${errors.email ? 'border-red-500' : 'border-ocean-primary/30'}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-ocean-primary" />
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="10-digit phone number"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => {
                  const error = validatePhone(formData.phone);
                  if (error) setErrors({ ...errors, phone: error });
                }}
                className={`glass-input ${errors.phone ? 'border-red-500' : 'border-ocean-primary/30'}`}
                maxLength={10}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.phone}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🔒 Password
              </label>
              <Input
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => {
                  const error = validatePassword(formData.password);
                  if (error) setErrors({ ...errors, password: error });
                }}
                className={`glass-input ${errors.password ? 'border-red-500' : 'border-ocean-primary/30'}`}
              />
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.color === 'red' ? 'bg-red-500 w-1/3' :
                          passwordStrength.color === 'yellow' ? 'bg-yellow-500 w-2/3' :
                          'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.color === 'red' ? 'text-red-600' :
                      passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.password}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Must be 8+ characters with uppercase, lowercase, number & special character
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🔒 Confirm Password
              </label>
              <Input
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                onBlur={() => {
                  const error = validateConfirmPassword(formData.confirmPassword);
                  if (error) setErrors({ ...errors, confirmPassword: error });
                }}
                className={`glass-input ${errors.confirmPassword ? 'border-red-500' : 'border-ocean-primary/30'}`}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <span className="text-xs">✓</span> Passwords match
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-ocean-primary" />
                Role
              </label>
              <select
                value={formData.role_id}
                onChange={(e) => handleChange('role_id', e.target.value)}
                onBlur={() => {
                  const error = validateRole(formData.role_id);
                  if (error) setErrors({ ...errors, role_id: error });
                }}
                className={`w-full glass-input ${errors.role_id ? 'border-red-500' : 'border-ocean-primary/30'}`}
              >
                <option value="">Select your role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.role_id && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="text-xs">⚠</span> {errors.role_id}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-light hover:to-ocean-secondary-light text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Register
                </div>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-ocean-primary/10 mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-ocean-primary hover:text-ocean-primary-dark transition-colors underline-offset-4 hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;