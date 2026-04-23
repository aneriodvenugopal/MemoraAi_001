/**
 * Festival Greetings - Simple brand recall system
 * 
 * ONLY:
 * - Republic Day (January 26)
 * - Independence Day (August 15)
 * 
 * Features:
 * - ON/OFF toggle (Admin only)
 * - Recipient management (customers only, NO leads)
 * - Manual send trigger
 * - Simple audit log
 * 
 * NO marketing, NO tracking, NO analytics, NO customization
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Flag, Users, Calendar, Send, UserPlus, Trash2, Download,
  Check, X, AlertCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fixed festivals - NO customization
const FESTIVALS = [
  {
    id: 'republic_day',
    name: 'Republic Day',
    date: 'January 26',
    emoji: '🇮🇳'
  },
  {
    id: 'independence_day',
    name: 'Independence Day',
    date: 'August 15',
    emoji: '🇮🇳'
  }
];

const FestivalGreetings = () => {
  const { user } = useAuth();
  
  // State
  const [config, setConfig] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(null);
  const [sending, setSending] = useState(false);
  
  // New recipient form
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    mobile: '',
    source_type: 'customer'
  });
  
  // Company name for config
  const [companyName, setCompanyName] = useState('');
  
  const isAdmin = user?.role === 'super_admin' || user?.role === 'tenant_admin';

  useEffect(() => {
    loadConfig();
    loadRecipients();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/festival-greetings/config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setConfig(response.data.config);
        setCompanyName(response.data.config?.company_name || '');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/festival-greetings/recipients`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setRecipients(response.data.recipients);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/festival-greetings/logs?limit=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleToggleGreetings = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter company name first');
      return;
    }
    
    const newEnabled = !(config?.is_enabled);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/festival-greetings/config?is_enabled=${newEnabled}&company_name=${encodeURIComponent(companyName)}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setConfig(response.data.config);
        toast.success(`Greetings ${newEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update config');
    }
  };

  const handleSaveCompanyName = async () => {
    if (!companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/festival-greetings/config?is_enabled=${config?.is_enabled || false}&company_name=${encodeURIComponent(companyName)}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setConfig(response.data.config);
        toast.success('Company name saved');
      }
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.name || !newRecipient.mobile) {
      toast.error('Name and mobile are required');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/festival-greetings/recipients`,
        newRecipient,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success('Recipient added');
        setShowAddRecipient(false);
        setNewRecipient({ name: '', mobile: '', source_type: 'customer' });
        loadRecipients();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add recipient');
    }
  };

  const handleRemoveRecipient = async (recipientId) => {
    if (!window.confirm('Remove this recipient?')) return;
    
    try {
      await axios.delete(
        `${API_URL}/api/festival-greetings/recipients/${recipientId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Recipient removed');
      loadRecipients();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const handleImportCustomers = async () => {
    if (!window.confirm('Import all customers as greeting recipients?')) return;
    
    try {
      const response = await axios.post(
        `${API_URL}/api/festival-greetings/recipients/import-customers`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        loadRecipients();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    }
  };

  const handleSendGreetings = async (festival) => {
    setSending(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/festival-greetings/send?festival=${festival}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        loadLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
      setShowSendConfirm(null);
    }
  };

  // Get next greeting date
  const getNextGreeting = () => {
    const today = new Date();
    const year = today.getFullYear();
    
    const republicDay = new Date(year, 0, 26); // Jan 26
    const independenceDay = new Date(year, 7, 15); // Aug 15
    
    if (today < republicDay) {
      return { festival: FESTIVALS[0], date: republicDay };
    } else if (today < independenceDay) {
      return { festival: FESTIVALS[1], date: independenceDay };
    } else {
      return { festival: FESTIVALS[0], date: new Date(year + 1, 0, 26) };
    }
  };

  const nextGreeting = getNextGreeting();
  const daysUntilNext = Math.ceil((nextGreeting.date - new Date()) / (1000 * 60 * 60 * 24));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Flag className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-green-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-green-100 rounded-xl">
            <Flag className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Festival Greetings</h1>
            <p className="text-slate-500">
              Republic Day (Jan 26) & Independence Day (Aug 15) only
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Greeting Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Next Greeting */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-green-50 rounded-xl border border-orange-200">
                <p className="text-sm text-slate-600 mb-1">Next Greeting</p>
                <p className="text-xl font-bold text-slate-800">
                  {nextGreeting.festival.emoji} {nextGreeting.festival.name}
                </p>
                <p className="text-sm text-slate-600">
                  {nextGreeting.festival.date} ({daysUntilNext} days away)
                </p>
              </div>
              
              {/* Enable/Disable Toggle */}
              {isAdmin && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">Greetings</p>
                    <p className="text-sm text-slate-500">
                      {config?.is_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Switch
                    checked={config?.is_enabled || false}
                    onCheckedChange={handleToggleGreetings}
                    disabled={!companyName.trim()}
                  />
                </div>
              )}
              
              {/* Company Name */}
              {isAdmin && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Company Name (for message)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Your Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <Button onClick={handleSaveCompanyName} variant="outline">
                      Save
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Message Preview */}
              <div className="p-4 bg-white border rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Message Preview</p>
                <p className="text-slate-700">
                  Warm wishes on {nextGreeting.festival.name} 🇮🇳
                  <br />
                  – {companyName || 'Your Company'}
                </p>
              </div>
              
              {/* Recipients Count */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Recipients</span>
                </div>
                <span className="text-2xl font-bold text-green-700">{recipients.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Festivals Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Greeting Days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FESTIVALS.map(festival => (
                <div 
                  key={festival.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{festival.emoji}</span>
                    <div>
                      <p className="font-medium text-slate-800">{festival.name}</p>
                      <p className="text-sm text-slate-500">{festival.date}</p>
                    </div>
                  </div>
                  {isAdmin && config?.is_enabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSendConfirm(festival.id)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-slate-400 text-center mt-4">
                Only these two dates. No customization.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Recipients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Recipients ({recipients.length})
              </CardTitle>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImportCustomers}
                      title="Import existing customers"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddRecipient(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {recipients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No recipients added</p>
                  <p className="text-sm text-slate-400">
                    Add customers to receive greetings
                  </p>
                </div>
              ) : (
                recipients.map(recipient => (
                  <div 
                    key={recipient.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{recipient.name}</p>
                      <p className="text-sm text-slate-500">{recipient.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {recipient.source_type}
                      </Badge>
                      {recipient.opted_out && (
                        <Badge variant="destructive" className="text-xs">
                          Opted Out
                        </Badge>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Only customers and past customers. NO leads, NO cold numbers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Send History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No greetings sent yet</p>
                </div>
              ) : (
                logs.map(log => (
                  <div 
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-lg border-l-4"
                    style={{ 
                      borderLeftColor: log.status === 'sent' ? '#22c55e' : '#ef4444' 
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm text-slate-800">
                        {log.recipient_name}
                      </p>
                      {log.status === 'sent' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{log.recipient_mobile}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {log.festival === 'republic_day' ? '🇮🇳 Republic Day' : '🇮🇳 Independence Day'}
                      {' • '}
                      {new Date(log.sent_at).toLocaleDateString()}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Recipient Modal */}
      <Dialog open={showAddRecipient} onOpenChange={setShowAddRecipient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Add Recipient
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Name</label>
              <Input
                placeholder="Recipient name"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Mobile</label>
              <Input
                placeholder="Mobile number"
                value={newRecipient.mobile}
                onChange={(e) => setNewRecipient(prev => ({ ...prev, mobile: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Source</label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={newRecipient.source_type}
                onChange={(e) => setNewRecipient(prev => ({ ...prev, source_type: e.target.value }))}
              >
                <option value="customer">Customer</option>
                <option value="past_customer">Past Customer</option>
                <option value="internal_contact">Internal Contact</option>
              </select>
              <p className="text-xs text-red-500 mt-1">
                Leads are NOT allowed. Only customers.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddRecipient(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddRecipient}
                disabled={!newRecipient.name || !newRecipient.mobile}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Recipient
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Modal */}
      <Dialog open={!!showSendConfirm} onOpenChange={() => setShowSendConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-600" />
              Send Greetings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-orange-800">
                {showSendConfirm === 'republic_day' ? '🇮🇳 Republic Day' : '🇮🇳 Independence Day'}
              </p>
              <p className="text-sm text-orange-700 mt-2">
                This will send greetings to {recipients.filter(r => !r.opted_out).length} recipients.
              </p>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Message:</p>
              <p className="mt-1 text-slate-800">
                Warm wishes on {showSendConfirm === 'republic_day' ? 'Republic Day' : 'Independence Day'} 🇮🇳
                <br />
                – {companyName}
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowSendConfirm(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleSendGreetings(showSendConfirm)}
                disabled={sending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {sending ? 'Sending...' : 'Send Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FestivalGreetings;
