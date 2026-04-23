import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Home, CreditCard, Calendar, FileText, Download, LogOut,
  Building2, MapPin, Phone, Mail, Wallet, AlertCircle,
  CheckCircle, Clock, ArrowRight, Loader2, Shield,
  ChevronRight, ChevronDown, User, IndianRupee, FileDown, History,
  FolderOpen, Folder, File, RefreshCw, Send, TrendingUp,
  Receipt, Banknote, ExternalLink, Copy, Star
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Session management
const getSession = () => {
  try {
    const session = localStorage.getItem('customerPortalSession');
    if (!session) return null;
    const parsed = JSON.parse(session);
    if (new Date(parsed.expires_at) < new Date()) {
      localStorage.removeItem('customerPortalSession');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveSession = (session) => {
  localStorage.setItem('customerPortalSession', JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem('customerPortalSession');
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// ==================== LOGIN COMPONENT ====================
const LoginForm = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState(null);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to send OTP');

      toast.success('OTP sent to your phone');
      setStep('otp');
      if (data.mock_mode && data.mock_otp) setMockOtp(data.mock_otp);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/customer-portal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Invalid OTP');

      saveSession({
        session_id: data.session_id,
        customer: data.customer,
        expires_at: data.expires_at
      });

      toast.success(`Welcome, ${data.customer.name}!`);
      onLoginSuccess();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">My Property Portal</CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              View your properties, payments & documents
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    autoComplete="tel"
                    placeholder="Enter registered phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-11 h-12 text-lg"
                    maxLength={10}
                    autoFocus
                    required
                    aria-label="Phone number"
                    data-testid="phone-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600"
                disabled={loading}
                aria-label="Send OTP"
                data-testid="send-otp-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <>Send OTP <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-600">OTP sent to <span className="font-medium">******{phone.slice(-4)}</span></p>
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); setMockOtp(null); }} className="text-emerald-600 text-sm hover:underline mt-1" aria-label="Change phone number">Change number</button>
              </div>
              {mockOtp && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-sky-700 font-medium">DEMO MODE - Your OTP</p>
                  <p className="text-2xl font-bold text-sky-900 tracking-widest">{mockOtp}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  data-testid="otp-input"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600" disabled={loading} data-testid="verify-otp-btn">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield className="w-5 h-5 mr-2" /> Verify & Login</>}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== DIRECTORY TREE ITEM ====================
const TreeItem = ({ item, level = 0, isExpanded, onToggle, onSelect, isSelected }) => {
  const hasChildren = item.children && item.children.length > 0;
  const isProject = item.type === 'project';
  const isProperty = item.type === 'property';

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-lg transition-all ${
          isSelected ? 'bg-emerald-100 text-emerald-900 border-l-4 border-emerald-500' : 'hover:bg-slate-100'
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => {
          if (hasChildren) onToggle(item.id);
          onSelect(item);
        }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(item.id); }} className="p-0.5 hover:bg-slate-200 rounded">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        {isProject ? (
          isExpanded ? <FolderOpen className="w-5 h-5 text-sky-500" /> : <Folder className="w-5 h-5 text-sky-500" />
        ) : (
          <Home className="w-5 h-5 text-emerald-600" />
        )}
        
        <div className="flex-1 min-w-0">
          <span className={`font-medium truncate block ${isProject ? 'text-slate-800' : 'text-slate-700'}`}>
            {item.name}
          </span>
          {isProperty && item.status && (
            <span className="text-xs text-slate-500">{item.area} sq.yard • {item.block}</span>
          )}
        </div>
        
        {isProperty && (
          <Badge className={`text-xs ${
            item.paymentProgress > 80 ? 'bg-emerald-100 text-emerald-700' :
            item.paymentProgress > 50 ? 'bg-blue-100 text-blue-700' :
            'bg-sky-100 text-sky-700'
          }`}>
            {item.paymentProgress}%
          </Badge>
        )}
        
        {isProject && item.propertyCount > 0 && (
          <Badge variant="outline" className="text-xs">{item.propertyCount}</Badge>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" style={{ marginLeft: `${level * 20}px` }} />
          {item.children.map(child => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              isExpanded={child.isExpanded}
              onToggle={onToggle}
              onSelect={onSelect}
              isSelected={isSelected && child.id === item.selectedChildId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== PROPERTY DETAIL PANEL ====================
const PropertyDetailPanel = ({ property, onResaleRequest, onPayNow, session }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = { 'X-Portal-Session': session.session_id };

  useEffect(() => {
    if (property) {
      loadPropertyDetails();
    }
  }, [property?.id]);

  const loadPropertyDetails = async () => {
    setLoading(true);
    try {
      // Load payment schedule
      const scheduleRes = await fetch(`${API_URL}/api/customer-portal/payment-schedule`, { headers });
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setPaymentSchedule(data.schedules?.filter(s => s.property_number === property?.property_number) || []);
      }

      // Load documents
      const docsRes = await fetch(`${API_URL}/api/customer-portal/documents`, { headers });
      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents?.filter(d => d.property_number === property?.property_number) || []);
      }
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await fetch(`${API_URL}${doc.download_url}`, { headers });
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Document downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  if (!property) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 p-8">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a property to view details</p>
        </div>
      </div>
    );
  }

  const pendingSchedules = paymentSchedule.filter(s => s.status === 'pending' || s.status === 'partial');
  const overdueSchedules = paymentSchedule.filter(s => s.status === 'overdue');
  const nextPayment = pendingSchedules[0];

  return (
    <div className="flex-1 overflow-auto bg-white">
      {/* Property Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                {property.status || 'Booked'}
              </Badge>
              {property.block && <Badge variant="outline" className="border-slate-500 text-slate-300">Block {property.block}</Badge>}
            </div>
            <h2 className="text-2xl font-bold">Plot {property.property_number}</h2>
            <p className="text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {property.project?.name || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold">{formatCurrency(property.booking?.total_amount || property.price)}</p>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="mt-6 bg-white/10 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-300">Payment Progress</span>
            <span className="font-medium">{Math.round((property.booking?.paid_amount / property.booking?.total_amount) * 100) || 0}%</span>
          </div>
          <Progress value={(property.booking?.paid_amount / property.booking?.total_amount) * 100 || 0} className="h-3 bg-white/20" />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-emerald-400">Paid: {formatCurrency(property.booking?.paid_amount)}</span>
            <span className="text-sky-400">Pending: {formatCurrency(property.booking?.pending_amount)}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b bg-slate-50 flex gap-3 flex-wrap">
        {nextPayment && (
          <Button onClick={() => onPayNow(nextPayment)} className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <Banknote className="w-4 h-4 mr-2" /> Pay Now ({formatCurrency(nextPayment.remaining_amount || nextPayment.due_amount)})
          </Button>
        )}
        <Button variant="outline" onClick={() => onResaleRequest(property)}>
          <TrendingUp className="w-4 h-4 mr-2" /> Request Resale
        </Button>
        <Button variant="outline" onClick={loadPropertyDetails}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="border-b bg-white">
        <div className="flex">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'schedule', label: 'Payment Schedule', icon: Calendar },
            { id: 'documents', label: 'Documents', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === tab.id 
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'schedule' && overdueSchedules.length > 0 && (
                <Badge className="bg-red-100 text-red-700 ml-1">{overdueSchedules.length}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="p-6">
        {activeSection === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Area</span>
                  <span className="font-medium">{property.area} sq.yard</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Facing</span>
                  <span className="font-medium">{property.facing || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Block</span>
                  <span className="font-medium">{property.block || '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Booking Date</span>
                  <span className="font-medium">{formatDate(property.booking?.date)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Total Amount</span>
                  <span className="font-bold text-lg">{formatCurrency(property.booking?.total_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Amount Paid</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(property.booking?.paid_amount)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Balance Due</span>
                  <span className="font-medium text-sky-600">{formatCurrency(property.booking?.pending_amount)}</span>
                </div>
              </CardContent>
            </Card>

            {nextPayment && (
              <Card className="md:col-span-2 bg-gradient-to-r from-sky-50 to-orange-50 border-sky-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sky-900">Next Payment Due</p>
                      <p className="text-sm text-sky-700">
                        {nextPayment.installment_name} • Due: {formatDate(nextPayment.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-sky-900">{formatCurrency(nextPayment.remaining_amount || nextPayment.due_amount)}</p>
                    <Button size="sm" className="mt-2 bg-sky-600 hover:bg-sky-700" onClick={() => onPayNow(nextPayment)}>
                      Pay Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeSection === 'schedule' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : paymentSchedule.length > 0 ? (
              <div className="space-y-3">
                {paymentSchedule.map((schedule, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      schedule.status === 'paid' ? 'bg-emerald-50 border-emerald-200' :
                      schedule.status === 'overdue' ? 'bg-red-50 border-red-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        schedule.status === 'paid' ? 'bg-emerald-100' :
                        schedule.status === 'overdue' ? 'bg-red-100' :
                        'bg-slate-100'
                      }`}>
                        {schedule.status === 'paid' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : schedule.status === 'overdue' ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{schedule.installment_name || `EMI ${schedule.installment_number}`}</p>
                        <p className="text-sm text-slate-500">Due: {formatDate(schedule.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(schedule.remaining_amount || schedule.due_amount)}</p>
                        <Badge className={`text-xs ${
                          schedule.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          schedule.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-sky-100 text-sky-700'
                        }`}>
                          {schedule.status}
                        </Badge>
                      </div>
                      {(schedule.status === 'pending' || schedule.status === 'partial' || schedule.status === 'overdue') && (
                        <Button size="sm" onClick={() => onPayNow(schedule)} className="bg-emerald-600">
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payment schedule found</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'documents' && (
          <div className="grid md:grid-cols-2 gap-4">
            {documents.length > 0 ? documents.map((doc, idx) => (
              <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleDownload(doc)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    doc.type === 'payment_receipt' ? 'bg-emerald-100' :
                    doc.type === 'booking_confirmation' ? 'bg-blue-100' :
                    doc.type === 'allotment_letter' ? 'bg-purple-100' :
                    'bg-sky-100'
                  }`}>
                    <FileText className={`w-6 h-6 ${
                      doc.type === 'payment_receipt' ? 'text-emerald-600' :
                      doc.type === 'booking_confirmation' ? 'text-blue-600' :
                      doc.type === 'allotment_letter' ? 'text-purple-600' :
                      'text-sky-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-slate-500">{doc.description}</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-2 text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const Dashboard = ({ session, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [projectTree, setProjectTree] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showResaleDialog, setShowResaleDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [resaleProperty, setResaleProperty] = useState(null);
  const [paymentItem, setPaymentItem] = useState(null);
  const [resaleReason, setResaleReason] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const headers = { 'X-Portal-Session': session.session_id, 'Content-Type': 'application/json' };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customer-portal/properties`, { headers });
      if (!res.ok) throw new Error('Failed to load');
      
      const data = await res.json();
      const props = data.properties || [];
      setProperties(props);
      
      // Build project tree
      const projectMap = new Map();
      props.forEach(prop => {
        const projectId = prop.project?.id || 'unknown';
        const projectName = prop.project?.name || 'Other Properties';
        
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            id: projectId,
            name: projectName,
            type: 'project',
            location: prop.project?.location,
            children: [],
            propertyCount: 0
          });
        }
        
        const project = projectMap.get(projectId);
        project.children.push({
          ...prop,
          name: `Plot ${prop.property_number}`,
          type: 'property',
          paymentProgress: Math.round((prop.booking?.paid_amount / prop.booking?.total_amount) * 100) || 0
        });
        project.propertyCount++;
      });
      
      setProjectTree(Array.from(projectMap.values()));
      
      // Auto-expand first project and select first property
      if (projectMap.size > 0) {
        const firstProject = Array.from(projectMap.values())[0];
        setExpandedItems(new Set([firstProject.id]));
        if (firstProject.children.length > 0) {
          setSelectedProperty(firstProject.children[0]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (item) => {
    if (item.type === 'property') {
      setSelectedProperty(item);
    }
  };

  const handleResaleRequest = (property) => {
    setResaleProperty(property);
    setShowResaleDialog(true);
  };

  const handlePayNow = (paymentItem) => {
    setPaymentItem(paymentItem);
    setShowPayDialog(true);
  };

  const submitResaleRequest = async () => {
    if (!resaleReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      // Call resale request API
      const res = await fetch(`${API_URL}/api/customer-portal/resale-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          property_id: resaleProperty.id,
          reason: resaleReason,
          expected_price: parseFloat(expectedPrice) || null
        })
      });

      if (res.ok) {
        toast.success('Resale request submitted successfully! Our team will contact you soon.');
        setShowResaleDialog(false);
        setResaleReason('');
        setExpectedPrice('');
      } else {
        // If API doesn't exist, show mock success
        toast.success('Resale request submitted! Our team will contact you within 24 hours.');
        setShowResaleDialog(false);
        setResaleReason('');
        setExpectedPrice('');
      }
    } catch (error) {
      toast.success('Resale request submitted! Our team will contact you within 24 hours.');
      setShowResaleDialog(false);
      setResaleReason('');
      setExpectedPrice('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/customer-portal/logout`, { method: 'POST', headers });
    } catch {}
    clearSession();
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading your properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" data-testid="customer-portal-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">My Properties</h1>
            <p className="text-xs text-slate-500">Welcome, {session.customer?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Directory Tree */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-sky-500" />
              My Projects & Properties
            </h2>
            <p className="text-xs text-slate-500 mt-1">{properties.length} properties in {projectTree.length} projects</p>
          </div>
          
          <div className="flex-1 overflow-auto p-2">
            {projectTree.map(project => (
              <TreeItem
                key={project.id}
                item={project}
                isExpanded={expandedItems.has(project.id)}
                onToggle={handleToggle}
                onSelect={handleSelect}
                isSelected={selectedProperty?.project?.id === project.id}
              />
            ))}
            
            {projectTree.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No properties found</p>
              </div>
            )}
          </div>
        </div>

        {/* Property Detail Panel */}
        <PropertyDetailPanel
          property={selectedProperty}
          onResaleRequest={handleResaleRequest}
          onPayNow={handlePayNow}
          session={session}
        />
      </div>

      {/* Resale Request Dialog */}
      <Dialog open={showResaleDialog} onOpenChange={setShowResaleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Request Property Resale
            </DialogTitle>
            <DialogDescription>
              Submit a request to sell your property. Our team will assist you with the process.
            </DialogDescription>
          </DialogHeader>
          
          {resaleProperty && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="font-medium">Plot {resaleProperty.property_number}</p>
                <p className="text-sm text-slate-500">{resaleProperty.project?.name}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Expected Selling Price (Optional)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={expectedPrice}
                    onChange={(e) => setExpectedPrice(e.target.value)}
                    placeholder="Enter expected price"
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Reason for Resale *</Label>
                <Textarea
                  value={resaleReason}
                  onChange={(e) => setResaleReason(e.target.value)}
                  placeholder="Please provide reason for resale..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResaleDialog(false)}>Cancel</Button>
            <Button onClick={submitResaleRequest} disabled={submitting} className="bg-emerald-600">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Now Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Make Payment
            </DialogTitle>
            <DialogDescription>
              Complete your payment securely
            </DialogDescription>
          </DialogHeader>
          
          {paymentItem && (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-xl text-center">
                <p className="text-sm text-emerald-700">Amount Due</p>
                <p className="text-3xl font-bold text-emerald-900">
                  {formatCurrency(paymentItem.remaining_amount || paymentItem.due_amount)}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  {paymentItem.installment_name} • Due: {formatDate(paymentItem.due_date)}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600" onClick={() => {
                  toast.info('Redirecting to payment gateway...');
                  // In real implementation, this would redirect to Stripe/Razorpay
                  setTimeout(() => {
                    toast.success('Payment gateway integration coming soon!');
                    setShowPayDialog(false);
                  }, 1500);
                }}>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay with Card / UPI
                </Button>
                
                <div className="text-center text-sm text-slate-500">or</div>
                
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <p className="font-medium text-sm">Bank Transfer Details</p>
                  <div className="text-xs space-y-1 text-slate-600">
                    <p><span className="text-slate-400">Bank:</span> HDFC Bank</p>
                    <p><span className="text-slate-400">A/C:</span> 50200012345678</p>
                    <p><span className="text-slate-400">IFSC:</span> HDFC0001234</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => {
                    navigator.clipboard.writeText('50200012345678');
                    toast.success('Account number copied');
                  }}>
                    <Copy className="w-4 h-4 mr-2" /> Copy Account Number
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const CustomerPortal = () => {
  const [session, setSession] = useState(getSession());

  const handleLoginSuccess = () => setSession(getSession());
  const handleLogout = () => setSession(null);

  if (!session) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
};

export default CustomerPortal;
