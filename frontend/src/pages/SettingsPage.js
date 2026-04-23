import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  Building2, 
  CreditCard, 
  Mail, 
  MessageSquare, 
  Bell, 
  Users, 
  Shield, 
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SettingsPage = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [settings, setSettings] = useState({
    // Company Info
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_logo: '',
    company_website: '',
    gstin: '',
    pan: '',
    
    // Payment Gateway - PayU
    payu_enabled: false,
    payu_merchant_key: '',
    payu_merchant_salt: '',
    payu_merchant_id: '',
    payu_mode: 'test', // 'test' or 'live'
    
    // Payment Gateway - Stripe
    stripe_enabled: false,
    stripe_public_key: '',
    stripe_secret_key: '',
    
    // SMS Settings
    sms_enabled: true,
    sms_provider: 'smslogin',
    sms_username: '',
    sms_api_key: '',
    sms_sender_id: '',
    
    // Email Settings
    email_enabled: false,
    email_provider: 'gmail',
    email_from: '',
    email_smtp_host: '',
    email_smtp_port: '',
    email_smtp_user: '',
    email_smtp_pass: '',
    
    // WhatsApp Settings
    whatsapp_enabled: false,
    whatsapp_api_key: '',
    whatsapp_phone_id: '',
    
    // Notification Preferences
    notify_new_lead: true,
    notify_booking: true,
    notify_payment: true,
    notify_site_visit: true
  });

  useEffect(() => {
    fetchTenantSettings();
  }, []);

  const fetchTenantSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tenants/my-tenant`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTenant(data);
        
        // Merge with settings
        setSettings(prev => ({
          ...prev,
          company_name: data.company_name || '',
          company_email: data.email || '',
          company_phone: data.phone || '',
          company_address: data.address || '',
          company_logo: data.logo_url || '',
          company_website: data.website || '',
          gstin: data.gstin || '',
          pan: data.pan || '',
          ...data.settings
        }));
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      if (!token) {
        toast.error('Not authenticated. Please login again.');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/tenants/my-tenant/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(data.detail || data.message || 'Failed to save settings');
        console.error('Save settings error:', data);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" />
            Settings
          </h1>
          <p className="text-gray-500">Configure your tenant settings and integrations</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="company" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <CreditCard className="w-4 h-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" /> SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1">
            <Mail className="w-4 h-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1">
            <Bell className="w-4 h-4" /> Alerts
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Your company details for invoices and communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={settings.company_name}
                    onChange={(e) => updateSetting('company_name', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={settings.company_email}
                    onChange={(e) => updateSetting('company_email', e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={settings.company_phone}
                    onChange={(e) => updateSetting('company_phone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={settings.company_website}
                    onChange={(e) => updateSetting('company_website', e.target.value)}
                    placeholder="https://www.company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input 
                    value={settings.gstin}
                    onChange={(e) => updateSetting('gstin', e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PAN</Label>
                  <Input 
                    value={settings.pan}
                    onChange={(e) => updateSetting('pan', e.target.value)}
                    placeholder="AAAAA0000A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input 
                  value={settings.company_address}
                  onChange={(e) => updateSetting('company_address', e.target.value)}
                  placeholder="Full company address"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments">
          <div className="space-y-6">
            {/* PayU */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      PayU Payment Gateway
                      {settings.payu_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription>Accept payments via PayU (UPI, Cards, NetBanking)</CardDescription>
                  </div>
                  <Switch 
                    checked={settings.payu_enabled}
                    onCheckedChange={(checked) => updateSetting('payu_enabled', checked)}
                  />
                </div>
              </CardHeader>
              {settings.payu_enabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Merchant Key</Label>
                      <Input 
                        value={settings.payu_merchant_key}
                        onChange={(e) => updateSetting('payu_merchant_key', e.target.value)}
                        placeholder="Your PayU Merchant Key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Merchant Salt</Label>
                      <Input 
                        type="password"
                        value={settings.payu_merchant_salt}
                        onChange={(e) => updateSetting('payu_merchant_salt', e.target.value)}
                        placeholder="Your PayU Merchant Salt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Merchant ID (MID)</Label>
                      <Input 
                        value={settings.payu_merchant_id}
                        onChange={(e) => updateSetting('payu_merchant_id', e.target.value)}
                        placeholder="5087302"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={settings.payu_mode}
                        onChange={(e) => updateSetting('payu_mode', e.target.value)}
                      >
                        <option value="test">Test (Sandbox)</option>
                        <option value="live">Live (Production)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Stripe */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Stripe Payment Gateway
                      {settings.stripe_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription>Accept international payments via Stripe</CardDescription>
                  </div>
                  <Switch 
                    checked={settings.stripe_enabled}
                    onCheckedChange={(checked) => updateSetting('stripe_enabled', checked)}
                  />
                </div>
              </CardHeader>
              {settings.stripe_enabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Public Key</Label>
                      <Input 
                        value={settings.stripe_public_key}
                        onChange={(e) => updateSetting('stripe_public_key', e.target.value)}
                        placeholder="pk_live_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secret Key</Label>
                      <Input 
                        type="password"
                        value={settings.stripe_secret_key}
                        onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
                        placeholder="sk_live_..."
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    SMS Configuration
                    {settings.sms_enabled ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </CardTitle>
                  <CardDescription>Configure SMS provider for OTP and notifications</CardDescription>
                </div>
                <Switch 
                  checked={settings.sms_enabled}
                  onCheckedChange={(checked) => updateSetting('sms_enabled', checked)}
                />
              </div>
            </CardHeader>
            {settings.sms_enabled && (
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✅ SMS Integration Active</p>
                  <p className="text-green-600 text-sm">Provider: SMS Login (smslogin.co)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={settings.sms_username}
                      onChange={(e) => updateSetting('sms_username', e.target.value)}
                      placeholder="Eloniot"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input 
                      type="password"
                      value={settings.sms_api_key}
                      onChange={(e) => updateSetting('sms_api_key', e.target.value)}
                      placeholder="Your API Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender ID</Label>
                    <Input 
                      value={settings.sms_sender_id}
                      onChange={(e) => updateSetting('sms_sender_id', e.target.value)}
                      placeholder="ELNIOT"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Email Configuration
                    {settings.email_enabled ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </CardTitle>
                  <CardDescription>Configure email for notifications and communications</CardDescription>
                </div>
                <Switch 
                  checked={settings.email_enabled}
                  onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
                />
              </div>
            </CardHeader>
            {settings.email_enabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={settings.email_provider}
                    onChange={(e) => updateSetting('email_provider', e.target.value)}
                  >
                    <option value="gmail">Gmail / GSuite</option>
                    <option value="smtp">Custom SMTP</option>
                    <option value="resend">Resend</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Email</Label>
                    <Input 
                      type="email"
                      value={settings.email_from}
                      onChange={(e) => updateSetting('email_from', e.target.value)}
                      placeholder="info@eloniot.com"
                    />
                  </div>
                  {settings.email_provider === 'smtp' && (
                    <>
                      <div className="space-y-2">
                        <Label>SMTP Host</Label>
                        <Input 
                          value={settings.email_smtp_host}
                          onChange={(e) => updateSetting('email_smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input 
                          value={settings.email_smtp_port}
                          onChange={(e) => updateSetting('email_smtp_port', e.target.value)}
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Username</Label>
                        <Input 
                          value={settings.email_smtp_user}
                          onChange={(e) => updateSetting('email_smtp_user', e.target.value)}
                          placeholder="your-email@gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password / App Password</Label>
                        <Input 
                          type="password"
                          value={settings.email_smtp_pass}
                          onChange={(e) => updateSetting('email_smtp_pass', e.target.value)}
                          placeholder="App Password"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which events should trigger notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">New Lead Notification</p>
                  <p className="text-sm text-gray-500">Get notified when a new lead is created</p>
                </div>
                <Switch 
                  checked={settings.notify_new_lead}
                  onCheckedChange={(checked) => updateSetting('notify_new_lead', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Booking Confirmation</p>
                  <p className="text-sm text-gray-500">Send confirmation when booking is made</p>
                </div>
                <Switch 
                  checked={settings.notify_booking}
                  onCheckedChange={(checked) => updateSetting('notify_booking', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="font-medium">Payment Alerts</p>
                  <p className="text-sm text-gray-500">Notify on payment received or due</p>
                </div>
                <Switch 
                  checked={settings.notify_payment}
                  onCheckedChange={(checked) => updateSetting('notify_payment', checked)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Site Visit Reminders</p>
                  <p className="text-sm text-gray-500">Send reminders for scheduled site visits</p>
                </div>
                <Switch 
                  checked={settings.notify_site_visit}
                  onCheckedChange={(checked) => updateSetting('notify_site_visit', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
