import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadService, categoryService, projectService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Phone, Mail, MapPin, Calendar, TrendingUp, Star, ExternalLink, X, Filter, MessageCircle, Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import PageInfoModal from '../components/PageInfoModal';
import ClickableStatCard from '../components/ClickableStatCard';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Leads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadDetails, setLeadDetails] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, converted
  
  // URL query filters
  const [urlFilters, setUrlFilters] = useState({
    quality: searchParams.get('quality') || '',
    source: searchParams.get('source') || '',
    status: searchParams.get('status') || '',
    assigned_to: searchParams.get('assigned_to') || ''
  });
  
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    tenant_id: user?.tenant_id || '',
    name: '',
    phone: '',
    email: '',
    source_id: '',
    status_id: '',
    project_id: '',
    budget_min: '',
    budget_max: '',
    notes: '',
    rating: 3,
  });

  const [followupData, setFollowupData] = useState({
    followup_type: 'call',
    notes: '',
    outcome: '',
    next_followup_date: '',
  });

  // WhatsApp Chat State
  const [showWhatsAppChat, setShowWhatsAppChat] = useState(false);
  const [chatLead, setChatLead] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef(null);

  // Quick reply templates
  const quickReplies = [
    "Hi! How can I help you today?",
    "Thank you for your interest. Would you like to schedule a site visit?",
    "I'll share property details with you shortly.",
    "What is your budget range?",
    "Are you looking to buy or invest?"
  ];

  // WhatsApp Templates (Approved - Eloniot Software Solutions)
  const whatsappTemplates = [
    {
      id: 'follow_up_template',
      name: 'Follow Up',
      description: 'Follow-up with existing lead',
      language: 'en',
      hasParams: true,
      params: ['name', 'agent', 'city', 'area'],
      endpoint: '/api/whatsapp/send-followup'
    },
    {
      id: 'leadintroductiontemplate',
      name: 'Welcome Message',
      description: 'Introduce to new lead',
      language: 'en',
      hasParams: true,
      params: ['name', 'agent', 'city', 'area'],
      endpoint: '/api/whatsapp/send-introduction'
    },
    {
      id: 'otp_1',
      name: 'OTP Verification',
      description: 'Send OTP code',
      language: 'en',
      hasParams: true,
      params: ['otp_code'],
      endpoint: '/api/whatsapp/send-template-live'
    }
  ];

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchCategories();
    fetchProjects();
  }, []);

  // Filter leads when filter changes
  useEffect(() => {
    let result = [...leads];
    
    // Apply basic filter (all/active/converted)
    if (activeFilter === 'active') {
      result = result.filter(l => !l.is_converted);
    } else if (activeFilter === 'converted') {
      result = result.filter(l => l.is_converted);
    }
    
    // Apply URL filters
    if (urlFilters.quality) {
      result = result.filter(l => {
        const rating = l.rating || 0;
        if (urlFilters.quality === 'Hot') return rating >= 4;
        if (urlFilters.quality === 'Warm') return rating === 3;
        if (urlFilters.quality === 'Cold') return rating <= 2;
        return true;
      });
    }
    
    if (urlFilters.source) {
      result = result.filter(l => l.source_name?.toLowerCase() === urlFilters.source.toLowerCase());
    }
    
    if (urlFilters.status) {
      result = result.filter(l => l.status_name?.toLowerCase() === urlFilters.status.toLowerCase());
    }
    
    if (urlFilters.assigned_to) {
      result = result.filter(l => l.assigned_to === urlFilters.assigned_to || l.assigned_to_name?.toLowerCase().includes(urlFilters.assigned_to.toLowerCase()));
    }
    
    setFilteredLeads(result);
  }, [leads, activeFilter, urlFilters]);

  const clearUrlFilters = () => {
    setUrlFilters({ quality: '', source: '', status: '', assigned_to: '' });
    setSearchParams({});
  };

  const hasActiveUrlFilters = urlFilters.quality || urlFilters.source || urlFilters.status || urlFilters.assigned_to;

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
  };

  const fetchLeads = async () => {
    try {
      const data = await leadService.getAll();
      setLeads(data);
    } catch (error) {
      toast.error('Failed to load leads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await leadService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const [statuses, sources, types] = await Promise.all([
        categoryService.getAll('lead_status', user?.tenant_id),
        categoryService.getAll('lead_source', user?.tenant_id),
        categoryService.getAll('property_type', user?.tenant_id),
      ]);
      setLeadStatuses(statuses);
      setLeadSources(sources);
      setPropertyTypes(types);
      
      if (statuses.length > 0) {
        const newStatus = statuses.find(s => s.slug === 'new');
        setFormData(prev => ({ ...prev, status_id: newStatus?.id || statuses[0].id }));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  // WhatsApp Chat Functions
  const openWhatsAppChat = (lead, e) => {
    e.stopPropagation();
    setChatLead(lead);
    setShowWhatsAppChat(true);
    // Load initial welcome message
    setChatMessages([
      {
        id: 'system-1',
        type: 'system',
        text: `Chat started with ${lead.name} (${lead.phone})`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const sendWhatsAppMessage = async () => {
    if (!newMessage.trim() || !chatLead) return;
    
    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Add message to chat immediately (optimistic update)
    const tempId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, {
      id: tempId,
      type: 'agent',
      text: messageText,
      timestamp: new Date().toISOString(),
      status: 'sending'
    }]);
    
    try {
      const response = await fetch(`${API_URL}/api/leads/public/send-whatsapp?phone=${chatLead.phone}&message=${encodeURIComponent(messageText)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      // Update message status
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, status: result.success ? 'sent' : 'failed', message_id: result.message_id }
          : msg
      ));
      
      if (result.success) {
        toast.success('Message sent to WhatsApp!');
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendQuickReply = (text) => {
    setNewMessage(text);
  };

  // Send WhatsApp Template Message
  const sendTemplateMessage = async (template) => {
    if (!chatLead) return;
    
    setSendingMessage(true);
    
    // Add to chat
    const tempId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, {
      id: tempId,
      type: 'agent',
      text: `📋 Sending template: ${template.name}`,
      timestamp: new Date().toISOString(),
      status: 'sending',
      isTemplate: true
    }]);
    
    try {
      let response;
      
      if (template.id === 'follow_up_template' || template.id === 'leadintroductiontemplate') {
        // Use dedicated endpoints for approved templates
        const payload = {
          phone: chatLead.phone,
          customer_name: chatLead.name || 'Sir',
          agent_name: user?.name || 'Agent',
          city: 'Vijayawada',
          area: chatLead.project_name || chatLead.interested_area || 'your area'
        };
        
        response = await fetch(`${API_URL}${template.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Fallback for other templates (otp etc)
        const templatePayload = {
          phone: chatLead.phone,
          template_name: template.id,
          language: template.language
        };
        
        if (template.hasParams && template.params) {
          if (template.id === 'otp_1') {
            templatePayload.params = [Math.floor(100000 + Math.random() * 900000).toString()];
          }
        }
        
        response = await fetch(`${API_URL}/api/whatsapp/send-template-live`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templatePayload)
        });
      }
      
      const result = await response.json();
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { 
              ...msg, 
              status: result.success ? 'sent' : 'failed',
              text: result.success 
                ? `✅ Template "${template.name}" sent successfully!`
                : `❌ Failed: ${result.error || 'Unknown error'}`
            }
          : msg
      ));
      
      if (result.success) {
        toast.success(`Template sent to ${chatLead.phone}!`);
      } else {
        toast.error(result.error || 'Failed to send template');
      }
    } catch (error) {
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed', text: `❌ Error: ${error.message}` } : msg
      ));
      toast.error('Failed to send template');
    } finally {
      setSendingMessage(false);
    }
  };

  // Scroll to bottom when new messages added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await leadService.create({
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
      });
      toast.success('Lead created successfully!');
      setShowCreateDialog(false);
      fetchLeads();
      fetchStats();
      // Reset form
      setFormData(prev => ({
        ...prev,
        name: '',
        phone: '',
        email: '',
        project_id: '',
        budget_min: '',
        budget_max: '',
        notes: '',
        rating: 3,
      }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeadDetails = async (lead) => {
    setSelectedLead(lead);
    setShowDetailsDialog(true);
    try {
      const details = await leadService.getDetails(lead.id);
      setLeadDetails(details);
    } catch (error) {
      toast.error('Failed to load lead details');
      console.error(error);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      await leadService.createFollowup({
        lead_id: selectedLead.id,
        followed_by: user.id,
        ...followupData,
        next_followup_date: followupData.next_followup_date || null,
      });
      toast.success('Follow-up added successfully!');
      setFollowupData({
        followup_type: 'call',
        notes: '',
        outcome: '',
        next_followup_date: '',
      });
      // Refresh lead details
      const details = await leadService.getDetails(selectedLead.id);
      setLeadDetails(details);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add follow-up');
      console.error(error);
    }
  };

  const getStatusColor = (statusId) => {
    const status = leadStatuses.find(s => s.id === statusId);
    const colors = {
      new: 'bg-blue-500',
      contacted: 'bg-blue-500',
      interested: 'bg-green-500',
      'site-visit-scheduled': 'bg-purple-500',
      negotiation: 'bg-orange-500',
      converted: 'bg-gray-700',
      lost: 'bg-red-500',
    };
    return status ? colors[status.slug] || 'bg-gray-500' : 'bg-gray-500';
  };

  const getStatusBadge = (statusId) => {
    const status = leadStatuses.find(s => s.id === statusId);
    return status ? (
      <Badge className={getStatusColor(statusId)}>
        {status.name}
      </Badge>
    ) : null;
  };

  if (loading && leads.length === 0) {
    return <div className="p-8">Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Leads</h2>
          <p className="text-gray-500">Manage your leads and follow-ups</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="lead-name">Name *</label>
                  <Input
                    id="lead-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                    autoComplete="name"
                    autoFocus
                    aria-label="Lead name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="lead-phone">Phone *</label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9876543210"
                    required
                    autoComplete="tel"
                    aria-label="Phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="lead-email">Email</label>
                <Input
                  id="lead-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  autoComplete="email"
                  aria-label="Email address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source</label>
                  <Select
                    value={formData.source_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, source_id: value }))}
                  >
                    <SelectTrigger aria-label="Select lead source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interested Project</label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                  >
                    <SelectTrigger aria-label="Select project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Min</label>
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                    placeholder="5000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Budget Max</label>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                    placeholder="8000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Quality Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      type="button"
                      variant={formData.rating >= rating ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, rating }))}
                    >
                      <Star className={`w-4 h-4 ${formData.rating >= rating ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats - Clickable Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ClickableStatCard 
            title="Total Leads" 
            value={stats.total_leads} 
            icon={Users} 
            color="blue"
            onClick={() => handleFilterClick('all')}
            subtitle="Click to view all"
            className={activeFilter === 'all' ? 'ring-2 ring-blue-500' : ''}
          />
          <ClickableStatCard 
            title="Active Leads" 
            value={stats.active_leads} 
            icon={TrendingUp} 
            color="green"
            onClick={() => handleFilterClick('active')}
            subtitle="Click to filter"
            className={activeFilter === 'active' ? 'ring-2 ring-green-500' : ''}
          />
          <ClickableStatCard 
            title="Converted" 
            value={stats.converted_leads} 
            icon={Star} 
            color="purple"
            onClick={() => handleFilterClick('converted')}
            subtitle="Click to filter"
            className={activeFilter === 'converted' ? 'ring-2 ring-purple-500' : ''}
          />
          <ClickableStatCard 
            title="Conversion Rate" 
            value={`${stats.conversion_rate.toFixed(1)}%`} 
            icon={TrendingUp} 
            color="orange"
            subtitle="Overall performance"
          />
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {activeFilter === 'all' ? 'All Leads' : activeFilter === 'active' ? 'Active Leads' : 'Converted Leads'}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'})
              </span>
            </CardTitle>
            {/* URL Filter Indicator */}
            {hasActiveUrlFilters && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Filter className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">Filtered by:</span>
                {urlFilters.quality && (
                  <Badge variant="secondary" className="text-xs">
                    Quality: {urlFilters.quality}
                  </Badge>
                )}
                {urlFilters.source && (
                  <Badge variant="secondary" className="text-xs">
                    Source: {urlFilters.source}
                  </Badge>
                )}
                {urlFilters.status && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {urlFilters.status}
                  </Badge>
                )}
                {urlFilters.assigned_to && (
                  <Badge variant="secondary" className="text-xs">
                    Staff: {urlFilters.assigned_to}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearUrlFilters}>
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
          {activeFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setActiveFilter('all')}>
              Clear Filter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {leads.length === 0 ? 'No leads yet' : 'No leads match filter'}
              </h3>
              <p className="text-gray-500 mb-4">
                {leads.length === 0 ? 'Start capturing leads to grow your business' : 'Try changing the filter above'}
              </p>
              {leads.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all duration-200 group"
                  onClick={() => handleViewLeadDetails(lead)}
                  data-testid={`lead-item-${lead.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold">
                      {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {lead.name}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <a 
                          href={`tel:${lead.phone}`} 
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                        </a>
                        {lead.email && (
                          <a 
                            href={`mailto:${lead.email}`} 
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-3 h-3" />
                            {lead.email}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* WhatsApp Chat Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 gap-1.5"
                      onClick={(e) => openWhatsAppChat(lead, e)}
                      data-testid={`whatsapp-btn-${lead.id}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    {lead.rating && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: lead.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-blue-400 text-blue-400" />
                        ))}
                      </div>
                    )}
                    {getStatusBadge(lead.status_id)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {leadDetails && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="followups">
                  Follow-ups ({leadDetails.followups?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="add-followup">Add Follow-up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <div>{leadDetails.lead.phone}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div>{leadDetails.lead.email || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div>{leadDetails.status?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project Interest</label>
                    <div>{leadDetails.project?.name || 'N/A'}</div>
                  </div>
                  {leadDetails.lead.budget_min && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Budget Range</label>
                      <div>
                        ₹{(leadDetails.lead.budget_min / 100000).toFixed(1)}L - 
                        ₹{(leadDetails.lead.budget_max / 100000).toFixed(1)}L
                      </div>
                    </div>
                  )}
                  {leadDetails.assigned_user && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assigned To</label>
                      <div>{leadDetails.assigned_user.name}</div>
                    </div>
                  )}
                </div>
                {leadDetails.lead.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded">{leadDetails.lead.notes}</div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="followups" className="space-y-3">
                {leadDetails.followups?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No follow-ups yet</p>
                ) : (
                  leadDetails.followups?.map((followup) => (
                    <Card key={followup.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge>{followup.followup_type}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(followup.followup_date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{followup.notes}</p>
                        {followup.outcome && (
                          <div className="mt-2 text-xs text-gray-600">
                            Outcome: <span className="font-medium">{followup.outcome}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="add-followup">
                <form onSubmit={handleAddFollowup} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Follow-up Type *</label>
                    <Select
                      value={followupData.followup_type}
                      onValueChange={(value) => setFollowupData(prev => ({ ...prev, followup_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes *</label>
                    <Textarea
                      value={followupData.notes}
                      onChange={(e) => setFollowupData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Follow-up notes..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Outcome</label>
                    <Select
                      value={followupData.outcome}
                      onValueChange={(value) => setFollowupData(prev => ({ ...prev, outcome: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="callback_later">Callback Later</SelectItem>
                        <SelectItem value="site_visit_scheduled">Site Visit Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Next Follow-up Date</label>
                    <Input
                      type="datetime-local"
                      value={followupData.next_followup_date}
                      onChange={(e) => setFollowupData(prev => ({ ...prev, next_followup_date: e.target.value }))}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Add Follow-up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Chat Modal */}
      <Dialog open={showWhatsAppChat} onOpenChange={setShowWhatsAppChat}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0 gap-0">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                {chatLead?.name?.charAt(0)?.toUpperCase() || 'L'}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{chatLead?.name}</h3>
                <p className="text-green-100 text-sm flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {chatLead?.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]" style={{backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAMqADAAQAAAABAAAAMgAAAABfvA/wAAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAAADFUlEQVRoBe2ZO0/jQBCAPyBKCh5FGl5C/AU4/gDlNdBR0VMhKOgQ/QPQoqShQlxDh7ih4g8gJIoUFDQk/AWaFDcxbDaz9nptr73j9Tm+xNqdnXl8M7u7E7TWUqHqe0AFABXACzLApKqCkIAKQJ2iArhBBrr6JQEVwAs6oKsgJKACeCL/L8hA/n8dVBESUAGcYH9tVUFIQAXwxA/kswGJ+reoYCRhB/9h0wL8e3VdXCZ8vVcP7AEVICxYQHAQKkB7EAIC+gCuCRUgLFhAcBAqQHsQAoL+ICvqoqJBQEAf4DVhB5q/R9fFZcLXe1mfYn9IvL8jkAAQEKqaEBCQdxAC+n9XNAgICNVBvqr/zR8r7EDj9yi7uEz4eq8e2APKAhKSCkICCPR+dhAC8n++UNGABICAzgp/k+0g+2Pt4jLh6z16YA+Ir/c8fXRRAZpLEhAQkHcQAvr+W9EgICAgl0gCwucw4eudeBAQEBASMILMz7WLy4Sv9+qBPaACeCIHxEkF6H8VIPLfioYCJOQaKYCAgIAQgPpPVTQgICB3EAJyT0lICAgI1UH2qv7NXSZ8vVcP7AH5er9K/y1JQEBAqGoCAjJPCAgJGKHqTxUNCAgICBVNSAjoWycoGgQExFsLCMj7dxVN+AchAaE6CEH8HyoaChBfbP4fCpCxg4QN/I9NLCoAHT8Q0E/hGhBwcaW1B1SAMB8hAc8gHEBe+i6g9gAfICz+/CkJKIAXNsD7c2khPSAgIA9QwD+f2L6+K+wBPUA/xPf7FCwQ0B3Eb/xQwPdL2MVlwtd7/NAe8AN6gJ4qf6LoXUHCFvYTf0hAQEDIwnW8QvQfXxAqgCdygJwTF9dJNfhYNAgI2Gd3EAI6N1Q0ICAg/g7ij/0dZH+sXVwmfL1HD+wBFcALCbhG8iEgJCCggPYL/wMBPeAfFPV/sLoAAAAASUVORK5CYII=")'}}>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'agent' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'}`}>
                {msg.type === 'system' ? (
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                    {msg.text}
                  </div>
                ) : msg.type === 'agent' ? (
                  <div className="max-w-[80%] bg-[#dcf8c6] rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {msg.status === 'sending' && <span className="text-xs text-gray-400">⏳</span>}
                      {msg.status === 'sent' && <span className="text-xs text-green-600">✓✓</span>}
                      {msg.status === 'failed' && <span className="text-xs text-red-500">❌</span>}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%] bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-500 font-medium">Lead</span>
                    </div>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-xs text-gray-500 block text-right mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Template Buttons */}
          <div className="px-3 py-2 bg-green-50 border-t border-green-100">
            <p className="text-xs text-green-700 font-medium mb-2">📋 Send WhatsApp Template (LIVE):</p>
            <div className="flex gap-2 flex-wrap">
              {whatsappTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => sendTemplateMessage(template)}
                  disabled={sendingMessage}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Replies */}
          <div className="px-3 py-2 bg-gray-100 border-t overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => sendQuickReply(reply)}
                  className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {reply.slice(0, 30)}{reply.length > 30 ? '...' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-3 bg-gray-100 border-t flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendWhatsAppMessage()}
            />
            <Button 
              onClick={sendWhatsAppMessage}
              disabled={sendingMessage || !newMessage.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PageInfoModal
        title="Leads Management"
        description="Comprehensive CRM system for capturing, tracking, and nurturing leads through your sales pipeline. Manage follow-ups, track lead quality, and convert prospects into customers with intelligent workflow automation."
        features={[
          "Create and manage leads with complete contact information",
          "Track lead sources (Walk-in, Website, Referral, Social Media, etc.)",
          "Lead status pipeline: New → Contacted → Interested → Site Visit → Negotiation → Converted/Lost",
          "Lead quality rating system (1-5 stars) for prioritization",
          "Budget range tracking for property matching",
          "Project interest association for targeted follow-ups",
          "Comprehensive follow-up management with multiple types (Call, Email, SMS, WhatsApp, Site Visit, Meeting)",
          "Follow-up history tracking with notes and outcomes",
          "Next follow-up date scheduling with reminders",
          "Real-time statistics: Total Leads, Active Leads, Converted, Conversion Rate",
          "Lead detail view with complete history and timeline",
          "Search and filter leads by status, source, or project"
        ]}
        technologies={[
          "React.js",
          "FastAPI Backend",
          "MongoDB",
          "Shadcn UI",
          "React Hook Form",
          "Lead Status Pipeline",
          "Follow-up System",
          "Analytics API"
        ]}
        implementations={[
          {
            title: "Lead Capture & Management",
            description: "Created comprehensive lead form with validation for name, phone (required), email, source, project interest, budget range (min/max), notes, and quality rating. Form uses Select components for dropdowns and star rating UI for quality assessment. All fields are properly validated before submission."
          },
          {
            title: "Follow-up Management System",
            description: "Built tabbed interface in lead details dialog: Details tab shows complete lead info, Follow-ups tab displays chronological history with badges and timestamps, Add Follow-up tab provides form for recording new interactions. Supports 6 follow-up types with outcome tracking and next follow-up scheduling."
          },
          {
            title: "Lead Status Pipeline",
            description: "Implemented 7-stage status pipeline with color-coded badges: New (blue), Contacted (yellow), Interested (green), Site Visit Scheduled (purple), Negotiation (orange), Converted (dark gray), Lost (red). Status updates tracked automatically through follow-up outcomes."
          },
          {
            title: "Statistics Dashboard",
            description: "Real-time KPI cards showing Total Leads, Active Leads (non-converted), Converted count, and Conversion Rate percentage. Data fetched from analytics API and updates automatically after lead actions. Color-coded stat cards with icons for visual clarity."
          },
          {
            title: "Lead Quality & Prioritization",
            description: "5-star rating system allows staff to mark lead quality/interest level. Star ratings displayed in lead list for quick visual scanning. Helps prioritize follow-up efforts on high-quality leads."
          }
        ]}
      />
    </div>
  );
};

export default Leads;
