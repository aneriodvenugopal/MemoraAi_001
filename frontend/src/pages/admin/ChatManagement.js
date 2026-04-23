import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../services/api';
import { MessageCircle, Eye, Filter, Download, Users, TrendingUp, Phone, Mail } from 'lucide-react';

function ChatManagement() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    is_lead: '',
    lead_status: ''
  });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    fetchConversations();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiInstance.get('/chatbot/admin/analytics');
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.is_lead) params.append('is_lead', filters.is_lead);
      if (filters.lead_status) params.append('lead_status', filters.lead_status);

      const response = await apiInstance.get(`/chatbot/admin/conversations?${params.toString()}`);
      if (response.data.success) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      if (error.response?.status === 403) {
        alert('Access denied.');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const viewConversation = async (conversationId) => {
    try {
      const response = await apiInstance.get(`/chatbot/admin/conversation/${conversationId}`);
      if (response.data.success) {
        setSelectedConversation(response.data.conversation);
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch conversation details:', error);
      alert('Failed to load conversation');
    }
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chat Management</h1>
              <p className="text-gray-600 mt-1">View conversations and manage leads</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Conversations</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total_conversations}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <MessageCircle className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.total_leads}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Users className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.lead_conversion_rate}%</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Messages</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.avg_messages_per_conversation}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <MessageCircle className="text-orange-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status</label>
              <select
                value={filters.is_lead}
                onChange={(e) => setFilters({...filters, is_lead: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Leads Only</option>
                <option value="false">Non-Leads</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Stage</label>
              <select
                value={filters.lead_status}
                onChange={(e) => setFilters({...filters, lead_status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Stages</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Conversations ({conversations.length})</h3>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => viewConversation(conv.id)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {conv.visitor_name || `Visitor ${conv.visitor_id.slice(0, 8)}`}
                          </h4>
                          {conv.is_lead && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              Lead
                            </span>
                          )}
                        </div>
                        {conv.visitor_phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone size={14} />
                            {conv.visitor_phone}
                          </p>
                        )}
                        {conv.visitor_email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail size={14} />
                            {conv.visitor_email}
                          </p>
                        )}
                        {conv.lead_interest && (
                          <p className="text-sm text-blue-600 mt-1">
                            Interest: {conv.lead_interest}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(conv.last_message_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.message_count} messages
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No conversations yet
                </div>
              )}
            </div>
          </div>

          {/* Conversation Detail */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedConversation ? 'Conversation Details' : 'Select a conversation'}
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[600px] p-4">
              {selectedConversation ? (
                <>
                  {/* Conversation Info */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Visitor Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedConversation.visitor_name || 'Anonymous'}</p>
                      <p><strong>Phone:</strong> {selectedConversation.visitor_phone || 'Not provided'}</p>
                      <p><strong>Email:</strong> {selectedConversation.visitor_email || 'Not provided'}</p>
                      <p><strong>Status:</strong> {selectedConversation.is_lead ? 'Lead' : 'Visitor'}</p>
                      {selectedConversation.lead_status && (
                        <p><strong>Lead Stage:</strong> {selectedConversation.lead_status}</p>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-2" />
                    <p>Select a conversation to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatManagement;
