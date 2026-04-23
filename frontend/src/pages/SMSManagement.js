import React, { useState, useEffect } from 'react';
import { smsService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, TrendingUp, CheckCircle, XCircle, 
  Phone, Calendar, DollarSign, FileText, Plus, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const SMSManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [smsForm, setSmsForm] = useState({
    recipient_phone: '',
    recipient_name: '',
    message_type: 'lead_ack',
    custom_message: '',
    language: 'hinglish',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData, templatesData] = await Promise.all([
        smsService.getSMSStats(),
        smsService.getSMSHistory({ limit: 50 }),
        smsService.getDefaultTemplates(),
      ]);

      setStats(statsData);
      setHistory(historyData.messages || []);
      setTemplates(templatesData.templates || {});
    } catch (error) {
      console.error('Failed to load SMS data:', error);
      toast.error('Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsForm.recipient_phone || !smsForm.custom_message) {
      toast.error('Phone number and message are required');
      return;
    }

    try {
      setSubmitting(true);
      await smsService.sendSMS({
        recipient_phone: smsForm.recipient_phone,
        recipient_name: smsForm.recipient_name || null,
        message_type: smsForm.message_type,
        custom_message: smsForm.custom_message,
      });

      toast.success('SMS sent successfully!');
      setShowSendDialog(false);
      setSmsForm({
        recipient_phone: '',
        recipient_name: '',
        message_type: 'lead_ack',
        custom_message: '',
        language: 'hinglish',
      });
      loadData();
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setSubmitting(false);
    }
  };

  const useTemplate = (messageType, language) => {
    const template = templates[messageType]?.[language] || '';
    setSmsForm({ ...smsForm, custom_message: template, message_type: messageType });
    setShowTemplateDialog(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'bg-blue-500',
      delivered: 'bg-green-500',
      failed: 'bg-red-500',
      pending: 'bg-blue-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getMessageTypeIcon = (type) => {
    const icons = {
      lead_ack: '👋',
      follow_up: '📞',
      payment_reminder: '💰',
      booking_confirm: '✅',
      site_visit: '📍',
      otp: '🔐',
    };
    return icons[type] || '📱';
  };

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2-$3');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
            SMS Automation
          </h1>
          <p className="text-gray-600 mt-1">Automated SMS notifications for leads, bookings, and payments</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>SMS Templates</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {Object.entries(templates).map(([type, languages]) => (
                  <Card key={type} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getMessageTypeIcon(type)}</span>
                        <h3 className="font-semibold capitalize">{type.replace('_', ' ')}</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(languages).map(([lang, template]) => (
                        <div key={lang} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">{lang}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => useTemplate(type, lang)}
                            >
                              Use Template
                            </Button>
                          </div>
                          <p className="text-sm text-gray-700">{template}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button className="bg-ocean-primary hover:bg-ocean-secondary">
                <Send className="w-4 h-4 mr-2" />
                Send SMS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send SMS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="+919876543210"
                      value={smsForm.recipient_phone}
                      onChange={(e) => setSmsForm({ ...smsForm, recipient_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Recipient Name</Label>
                    <Input
                      placeholder="Customer name"
                      value={smsForm.recipient_name}
                      onChange={(e) => setSmsForm({ ...smsForm, recipient_name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Message Type</Label>
                  <Select value={smsForm.message_type} onValueChange={(val) => setSmsForm({ ...smsForm, message_type: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead_ack">👋 Lead Acknowledgment</SelectItem>
                      <SelectItem value="follow_up">📞 Follow-up</SelectItem>
                      <SelectItem value="payment_reminder">💰 Payment Reminder</SelectItem>
                      <SelectItem value="booking_confirm">✅ Booking Confirmation</SelectItem>
                      <SelectItem value="site_visit">📍 Site Visit</SelectItem>
                      <SelectItem value="otp">🔐 OTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Message *</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTemplateDialog(true)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Use Template
                    </Button>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder="Enter your message"
                    value={smsForm.custom_message}
                    onChange={(e) => setSmsForm({ ...smsForm, custom_message: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {smsForm.custom_message.length} characters
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendSMS}
                  disabled={submitting || !smsForm.recipient_phone || !smsForm.custom_message}
                  className="bg-ocean-primary hover:bg-ocean-secondary"
                >
                  {submitting ? 'Sending...' : 'Send SMS'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold mt-2">{stats?.total_messages || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {stats?.stats_by_type ? Object.values(stats.stats_by_type).reduce((sum, stat) => sum + stat.delivered, 0) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600 mt-2">
                      {stats?.stats_by_type ? Object.values(stats.stats_by_type).reduce((sum, stat) => sum + stat.failed, 0) : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      ₹{stats?.total_cost?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Mock pricing</p>
              </CardContent>
            </Card>
          </div>

          {/* Stats by Type */}
          {stats?.stats_by_type && Object.keys(stats.stats_by_type).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Messages by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.stats_by_type).map(([type, stat]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getMessageTypeIcon(type)}</span>
                        <div>
                          <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">
                            {stat.count} sent • {stat.delivered} delivered • {stat.failed} failed
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-ocean-primary">
                        ₹{stat.cost.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                  <p className="text-gray-500 mb-4">Send your first SMS to get started</p>
                  <Button
                    onClick={() => setShowSendDialog(true)}
                    className="bg-ocean-primary hover:bg-ocean-secondary"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send SMS
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((sms) => (
                    <Card key={sms.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">{getMessageTypeIcon(sms.message_type)}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold capitalize">{sms.message_type.replace('_', ' ')}</h4>
                                <Badge className={getStatusColor(sms.status)}>
                                  {sms.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                <Phone className="w-3 h-3 inline mr-1" />
                                {formatPhone(sms.recipient_phone)}
                                {sms.recipient_name && ` • ${sms.recipient_name}`}
                              </p>
                              <p className="text-sm bg-gray-50 p-2 rounded">{sms.message_body}</p>
                              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                <span>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDate(sms.sent_at)}
                                </span>
                                <span>ID: {sms.provider_message_id}</span>
                                <span>Cost: ₹{sms.cost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SMSManagement;
