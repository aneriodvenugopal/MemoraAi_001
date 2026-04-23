import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Mail, Send, CheckCircle2, XCircle, Clock, Eye, ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmailManagement = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Test email form
  const [testEmail, setTestEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch all data in parallel
      const [statusRes, statsRes, templatesRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/email/status`),
        fetch(`${API_URL}/api/email/stats`, { headers }),
        fetch(`${API_URL}/api/email/templates`),
        fetch(`${API_URL}/api/email/logs?limit=20`, { headers })
      ]);
      
      const [status, statsData, templatesData, logsData] = await Promise.all([
        statusRes.json(),
        statsRes.json(),
        templatesRes.json(),
        logsRes.json()
      ]);
      
      setServiceStatus(status);
      setStats(statsData);
      setTemplates(templatesData.templates || []);
      setLogs(logsData.logs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load email data');
    }
    setLoading(false);
  };

  const sendTestEmail = async () => {
    if (!testEmail || !selectedTemplate) {
      toast.error('Please enter email and select a template');
      return;
    }
    
    setSendingTest(true);
    try {
      const res = await fetch(`${API_URL}/api/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to_email: testEmail,
          template_type: selectedTemplate
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(`Test ${selectedTemplate} email sent to ${testEmail}`);
        fetchData(); // Refresh stats
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      toast.error(error.message);
    }
    setSendingTest(false);
  };

  const previewTemplate = async (templateId) => {
    try {
      const res = await fetch(`${API_URL}/api/email/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ template_type: templateId })
      });
      
      const result = await res.json();
      setPreviewHtml(result.html);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to preview template');
    }
  };

  const getStatusBadge = (success) => {
    if (success) {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Sent</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="email-management-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-lg">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Email Management</h1>
                <p className="text-blue-100">Send and manage transactional emails</p>
              </div>
            </div>
            <Button onClick={fetchData} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Service Status Banner */}
        {serviceStatus && !serviceStatus.configured && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Email Service in MOCK Mode</p>
                <p className="text-sm text-amber-700">
                  Configure RESEND_API_KEY in backend/.env to enable real email sending.
                  Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Sent</p>
                  <p className="text-3xl font-bold text-slate-900">{stats?.total_sent || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Successful</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.successful || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.failed || 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Provider</p>
                  <p className="text-xl font-bold text-slate-900 capitalize">{stats?.current_provider || 'mock'}</p>
                </div>
                <Badge variant={stats?.service_configured ? 'default' : 'secondary'}>
                  {stats?.service_configured ? 'Configured' : 'Mock Mode'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send" data-testid="tab-send">Send Test Email</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Email Logs</TabsTrigger>
          </TabsList>

          {/* Send Test Email Tab */}
          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>Test email templates by sending them to your email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Recipient Email</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      data-testid="test-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger data-testid="template-select">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={sendTestEmail} 
                  disabled={sendingTest || !testEmail || !selectedTemplate}
                  data-testid="send-test-email-btn"
                >
                  {sendingTest ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Send Test Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Pre-built templates for different types of communications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{template.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.variables.slice(0, 4).map((v) => (
                                <Badge key={v} variant="outline" className="text-xs">
                                  {'{' + v + '}'}
                                </Badge>
                              ))}
                              {template.variables.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.variables.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => previewTemplate(template.id)}
                            data-testid={`preview-${template.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>Recent email activity</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No emails sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${log.success ? 'bg-green-100' : 'bg-red-100'}`}>
                            {log.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{log.to_email}</p>
                            <p className="text-sm text-slate-500">{log.subject}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{log.type}</Badge>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Email Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                ✕
              </Button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-60px)]">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[600px] border-0"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManagement;
