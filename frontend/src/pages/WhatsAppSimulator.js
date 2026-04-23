import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, MessageSquare, Bot, User, Trash2, RefreshCw, ChevronDown, Info, Loader2, Phone, Languages, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WhatsAppSimulator = () => {
  const { user, token } = useAuth();
  const [phone, setPhone] = useState('9999000001');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testingAllAgents, setTestingAllAgents] = useState(false);
  const [agentTestResults, setAgentTestResults] = useState(null);
  const [agentsInfo, setAgentsInfo] = useState(null);
  const [showAgentsInfo, setShowAgentsInfo] = useState(false);
  const chatEndRef = useRef(null);

  // Sample messages for quick testing
  const sampleMessages = [
    { label: 'Greeting', message: 'Hi, good morning!', agent: 'GreetingAgent' },
    { label: 'Budget Info', message: 'My budget is 50 lakhs, looking for plot in Hyderabad', agent: 'QualificationAgent' },
    { label: 'Available Plots', message: 'Show me available plots', agent: 'InventoryAgent' },
    { label: 'Amenities', message: 'What amenities are available in your project?', agent: 'KnowledgeAgent' },
    { label: 'Site Visit', message: 'I want to schedule a site visit tomorrow morning', agent: 'SiteVisitAgent' },
    { label: 'Booking', message: 'I want to book plot A12', agent: 'BookingAgent' },
    { label: 'Payment', message: 'What are the payment options and EMI plans?', agent: 'PaymentAgent' },
    { label: 'Telugu', message: 'నమస్కారం, మీరు ప్లాట్లు అమ్ముతున్నారా?', agent: 'Multi-language' },
    { label: 'Hindi', message: 'नमस्ते, मुझे प्लॉट चाहिए', agent: 'Multi-language' },
    { label: 'Human Request', message: 'I want to talk to a real person', agent: 'Human Handoff' },
  ];

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    fetchAgentsInfo();
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAgentsInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/agents-info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAgentsInfo(data);
      }
    } catch (error) {
      console.error('Error fetching agents info:', error);
    }
  };

  const sendMessage = async (messageText = message) => {
    if (!messageText.trim()) return;

    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/whatsapp/simulate?phone=${phone}&message=${encodeURIComponent(messageText)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      // Handle human handoff active state
      if (data.action_taken === 'human_handoff_active' || data.action === 'human_handoff_active') {
        const systemMessage = {
          id: Date.now() + 1,
          role: 'system',
          content: '⚠️ AI is paused for this conversation (Human Handoff Active). Click "Reset Conversation" to start fresh testing.',
          timestamp: new Date().toISOString(),
          metadata: {
            action: data.action_taken || data.action,
            state: 'human_handoff'
          }
        };
        setConversation(prev => [...prev, systemMessage]);
        toast.warning('Conversation is with human agent. Reset to test AI again.');
      } else if (data.success || data.ai_response) {
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.ai_response || 'AI is processing your request...',
          timestamp: new Date().toISOString(),
          metadata: {
            intent: data.intent_detected,
            state: data.conversation_state,
            action: data.action_taken,
            humanFollowup: data.human_followup_required
          }
        };
        setConversation(prev => [...prev, aiMessage]);
        
        if (data.human_followup_required) {
          toast.info('Human follow-up required for this conversation');
        }
      } else {
        toast.error(data.detail || 'Failed to get AI response');
        // Add error message to conversation
        setConversation(prev => [...prev, {
          id: Date.now() + 1,
          role: 'system',
          content: `Error: ${data.detail || 'Failed to process message'}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setConversation(prev => [...prev, {
        id: Date.now() + 1,
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const testAllAgents = async () => {
    setTestingAllAgents(true);
    setAgentTestResults(null);
    
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/simulate/test-all-agents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setAgentTestResults(data);
      toast.success(`Tested ${data.total_tests} agents`);
    } catch (error) {
      console.error('Error testing agents:', error);
      toast.error('Failed to test agents');
    } finally {
      setTestingAllAgents(false);
    }
  };

  const cleanupTestData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/simulate/cleanup`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      toast.success(`Cleaned up: ${data.conversations_deleted} conversations, ${data.messages_deleted} messages`);
      setConversation([]);
      setAgentTestResults(null);
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Failed to cleanup test data');
    }
  };

  const resetConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/simulate/reset/${phone}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setConversation([]);
      } else {
        toast.error('Failed to reset conversation');
      }
    } catch (error) {
      console.error('Error resetting conversation:', error);
      toast.error('Failed to reset conversation');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="whatsapp-simulator-page">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">WhatsApp AI Simulator</h1>
                <p className="text-gray-400 text-sm">Test 7 AI agents without live WhatsApp connection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAgentsInfo(!showAgentsInfo)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
                data-testid="show-agents-info-btn"
              >
                <Info className="w-4 h-4" />
                Agents Info
              </button>
              <button
                onClick={testAllAgents}
                disabled={testingAllAgents}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                data-testid="test-all-agents-btn"
              >
                {testingAllAgents ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Test All Agents
              </button>
              <button
                onClick={cleanupTestData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
                data-testid="cleanup-btn"
              >
                <Trash2 className="w-4 h-4" />
                Cleanup
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Quick Actions */}
          <div className="space-y-4">
            {/* Phone Number Input */}
            <div className="bg-gray-800 rounded-xl p-4">
              <label className="block text-sm text-gray-400 mb-2">Test Phone Number</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  data-testid="phone-input"
                />
              </div>
              <button
                onClick={resetConversation}
                className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                data-testid="reset-conversation-btn"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Conversation (Re-enable AI)
              </button>
            </div>

            {/* Quick Test Messages */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Test Messages</h3>
              <div className="space-y-2">
                {sampleMessages.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(sample.message)}
                    disabled={loading}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    data-testid={`quick-msg-${idx}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{sample.label}</span>
                      <span className="text-xs text-green-400">{sample.agent}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{sample.message}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Agents Info Panel */}
            {showAgentsInfo && agentsInfo && (
              <div className="bg-gray-800 rounded-xl p-4 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI Agents ({agentsInfo.agents?.length || 0})
                </h3>
                <div className="space-y-3">
                  {agentsInfo.agents?.map((agent, idx) => (
                    <div key={idx} className="p-3 bg-gray-700 rounded-lg">
                      <h4 className="text-sm font-medium text-green-400">{agent.name}</h4>
                      <p className="text-xs text-gray-400 mt-1">{agent.purpose}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.triggers?.slice(0, 3).map((trigger, tidx) => (
                          <span key={tidx} className="px-2 py-0.5 bg-gray-600 rounded text-xs">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Languages className="w-4 h-4" />
                    Languages: {agentsInfo.supported_languages?.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Chat Window */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Chat Header */}
            <div className="bg-gray-800 rounded-t-xl p-4 flex items-center gap-3 border-b border-gray-700">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">MemoraAI AI Assistant</h3>
                <p className="text-xs text-green-400">Online • Simulated Mode</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-gray-800 flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]" data-testid="chat-messages">
              {conversation.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Send a message to start testing the AI</p>
                  <p className="text-xs mt-2">Use quick test messages on the left or type your own</p>
                </div>
              ) : (
                conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-green-600 text-white rounded-br-md'
                          : msg.role === 'system'
                          ? 'bg-red-900 text-red-200 rounded-bl-md'
                          : 'bg-gray-700 text-white rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.metadata && (
                        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400 space-y-1">
                          {msg.metadata.intent && (
                            <div>Intent: <span className="text-blue-400">{msg.metadata.intent}</span></div>
                          )}
                          {msg.metadata.state && (
                            <div>State: <span className="text-blue-400">{msg.metadata.state}</span></div>
                          )}
                          {msg.metadata.action && (
                            <div>Action: <span className="text-green-400">{msg.metadata.action}</span></div>
                          )}
                          {msg.metadata.humanFollowup && (
                            <div className="text-orange-400">Human follow-up required</div>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-gray-800 rounded-b-xl p-4 border-t border-gray-700">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1 bg-gray-700 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  data-testid="message-input"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !message.trim()}
                  className="p-3 bg-green-600 hover:bg-green-700 rounded-full disabled:opacity-50 transition-colors"
                  data-testid="send-btn"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Test Results */}
        {agentTestResults && (
          <div className="mt-6 bg-gray-800 rounded-xl p-4" data-testid="agent-test-results">
            <h3 className="text-lg font-semibold mb-4">Agent Test Results ({agentTestResults.total_tests} tests)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentTestResults.results?.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${result.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{result.agent}</span>
                    <span className={`text-xs px-2 py-1 rounded ${result.success ? 'bg-green-600' : 'bg-red-600'}`}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">Input: {result.input_message}</p>
                  {result.error ? (
                    <p className="text-xs text-red-400">{result.error}</p>
                  ) : (
                    <>
                      <p className="text-xs text-blue-400">Intent: {result.actual_intent}</p>
                      <p className="text-xs text-gray-300 mt-2 line-clamp-3">{result.ai_response}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSimulator;
