import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import apiInstance from '../services/api';

const ChatWidget = ({ tenantId = null, position = 'bottom-right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [visitorId, setVisitorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', interest: '' });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Generate or get visitor ID
  useEffect(() => {
    let vid = localStorage.getItem('chat_visitor_id');
    if (!vid) {
      vid = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('chat_visitor_id', vid);
    }
    setVisitorId(vid);
    
    // Load conversation ID if exists
    const cid = localStorage.getItem('chat_conversation_id');
    if (cid) {
      setConversationId(cid);
      loadConversationHistory(cid);
    }
  }, []);

  // Load chatbot config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const params = tenantId ? `?tenant_id=${tenantId}` : '';
        const response = await apiInstance.get(`/chatbot/config${params}`);
        if (response.data.success) {
          setConfig(response.data.config);
          
          // Add welcome message if new conversation
          if (!conversationId && response.data.config.welcome_message) {
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: response.data.config.welcome_message,
              timestamp: new Date().toISOString()
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to load chatbot config:', error);
      }
    };
    
    fetchConfig();
  }, [tenantId, conversationId]);

  // Load conversation history
  const loadConversationHistory = async (cid) => {
    try {
      const response = await apiInstance.get(`/chatbot/history/${cid}`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await apiInstance.post('/chatbot/message', {
        conversation_id: conversationId,
        tenant_id: tenantId,
        visitor_id: visitorId,
        content: inputMessage,
        language: 'en'
      });

      if (response.data.success) {
        // Save conversation ID
        if (!conversationId) {
          setConversationId(response.data.conversation_id);
          localStorage.setItem('chat_conversation_id', response.data.conversation_id);
        }

        // Add assistant response
        setMessages(prev => [...prev, response.data.assistant_message]);

        // Check if lead capture should be shown
        if (response.data.should_capture_lead && !leadData.phone) {
          setShowLeadForm(true);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitLeadForm = async () => {
    if (!leadData.name || !leadData.phone) {
      alert('Please provide at least your name and phone number');
      return;
    }

    try {
      await apiInstance.post('/chatbot/capture-lead', {
        conversation_id: conversationId,
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        interest: leadData.interest
      });

      setShowLeadForm(false);
      setMessages(prev => [...prev, {
        id: `system_${Date.now()}`,
        role: 'assistant',
        content: `Thank you, ${leadData.name}! I've saved your contact information. Our team will reach out to you soon. How else can I help you today?`,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error capturing lead:', error);
      alert('Failed to save your information. Please try again.');
    }
  };

  const primaryColor = config?.branding?.primary_color || '#3b82f6';
  const secondaryColor = config?.branding?.secondary_color || '#1e40af';
  
  // Position styles
  const positionClasses = position === 'bottom-left' 
    ? 'bottom-4 left-4' 
    : 'bottom-4 right-4';

  if (!visitorId) return null;

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <div className={`mb-4 bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-[500px]'
        } w-[380px] flex flex-col`}>
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 text-white cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-3">
              {config?.branding?.logo_url ? (
                <img src={config.branding.logo_url} alt="Logo" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle size={18} />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">{config?.bot_name || 'Chat Assistant'}</h3>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-white/20 p-1 rounded">
                <Minimize2 size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-white/20 p-1 rounded">
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'text-white'
                          : 'bg-white text-gray-800 shadow-sm'
                      }`}
                      style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Lead Form Overlay */}
              {showLeadForm && (
                <div className="absolute inset-0 bg-white z-10 p-4 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Your Details</h3>
                  <p className="text-sm text-gray-600 mb-4">Help us serve you better by sharing your contact information.</p>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={leadData.name}
                      onChange={(e) => setLeadData({...leadData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={leadData.phone}
                      onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Email (Optional)"
                      value={leadData.email}
                      onChange={(e) => setLeadData({...leadData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="What are you looking for? (Optional)"
                      value={leadData.interest}
                      onChange={(e) => setLeadData({...leadData, interest: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={submitLeadForm}
                        className="flex-1 py-2 text-white rounded-lg font-medium hover:opacity-90 transition"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => setShowLeadForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !inputMessage.trim()}
                    className="p-2 rounded-full text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full text-white shadow-lg hover:scale-110 transition-all flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
        >
          <MessageCircle size={24} />
          {/* Notification badge (optional) */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
            1
          </span>
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
