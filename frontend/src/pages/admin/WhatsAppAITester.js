import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Bot, User, Sparkles, RefreshCw, 
  Phone, Brain, Target, Calendar, CreditCard, Home, HelpCircle,
  Trash2, TestTube, ChevronRight, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WhatsAppAITester = () => {
  const { token } = useAuth();
  const [phone, setPhone] = useState('9876543210');
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [agentsInfo, setAgentsInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  useEffect(() => {
    fetchAgentsInfo();
  }, []);

  const fetchAgentsInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/agents-info`);
      const data = await res.json();
      setAgentsInfo(data);
    } catch (err) {
      console.error('Error fetching agents info:', err);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message;
    setMessage('');
    
    // Add user message to UI immediately
    setConversations(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/whatsapp/simulate?phone=${phone}&message=${encodeURIComponent(userMessage)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (data.success) {
        // Add AI response
        setConversations(prev => [...prev, {
          role: 'assistant',
          content: data.ai_response,
          intent: data.intent_detected,
          state: data.conversation_state,
          action: data.action_taken,
          timestamp: new Date().toISOString()
        }]);
        toast.success(`Intent: ${data.intent_detected}`);
      } else {
        toast.error(data.detail || 'Failed to process message');
      }
    } catch (err) {
      toast.error('Error sending message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const testAllAgents = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      const res = await fetch(`${API_URL}/api/whatsapp/simulate/test-all-agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResults(data);
      toast.success(`Tested ${data.total_tests} agents!`);
    } catch (err) {
      toast.error('Error testing agents');
    } finally {
      setLoading(false);
    }
  };

  const cleanupTests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/whatsapp/simulate/cleanup`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations([]);
      setTestResults(null);
      toast.success(`Cleaned up ${data.conversations_deleted} conversations`);
    } catch (err) {
      toast.error('Error cleaning up');
    }
  };

  const quickMessages = [
    { text: "Hi, good morning!", icon: "👋", agent: "Greeting" },
    { text: "My budget is 50 lakhs for a plot", icon: "💰", agent: "Qualification" },
    { text: "Show me available plots", icon: "🏠", agent: "Inventory" },
    { text: "What amenities do you have?", icon: "❓", agent: "Knowledge" },
    { text: "I want to visit the site tomorrow", icon: "📅", agent: "SiteVisit" },
    { text: "I want to book plot A12", icon: "✅", agent: "Booking" },
    { text: "What are the EMI options?", icon: "💳", agent: "Payment" },
    { text: "నమస్కారం, plots చూడాలి", icon: "🇮🇳", agent: "Telugu" },
  ];

  const getAgentIcon = (intent) => {
    const icons = {
      'greeting': <MessageSquare className="w-4 h-4" />,
      'price_inquiry': <CreditCard className="w-4 h-4" />,
      'availability_check': <Home className="w-4 h-4" />,
      'site_visit_request': <Calendar className="w-4 h-4" />,
      'booking_interest': <Target className="w-4 h-4" />,
      'payment_question': <CreditCard className="w-4 h-4" />,
      'general_question': <HelpCircle className="w-4 h-4" />,
    };
    return icons[intent] || <Brain className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Bot className="w-8 h-8 text-purple-400" />
            WhatsApp AI Tester
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </h1>
          <p className="text-gray-400 mt-2">Test all 7 AI agents without real WhatsApp</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 justify-center">
          {['chat', 'test-all', 'agents'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab === 'chat' && '💬 Chat Simulator'}
              {tab === 'test-all' && '🧪 Test All Agents'}
              {tab === 'agents' && '🤖 Agents Info'}
            </button>
          ))}
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Messages */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Quick Test Messages
              </h3>
              <div className="space-y-2">
                {quickMessages.map((qm, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMessage(qm.text);
                    }}
                    className="w-full text-left px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-all flex items-center gap-2"
                  >
                    <span>{qm.icon}</span>
                    <span className="flex-1 truncate">{qm.text}</span>
                    <span className="text-xs text-purple-400">{qm.agent}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="text-gray-400 text-sm">Test Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="9876543210"
                />
              </div>

              <button
                onClick={cleanupTests}
                className="w-full mt-4 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Test Data
              </button>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700 flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">Customer: {phone}</p>
                  <p className="text-gray-400 text-xs">Simulated WhatsApp Chat</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversations.length === 0 && (
                  <div className="text-center text-gray-500 py-10">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Send a message to test the AI</p>
                    <p className="text-sm mt-1">Try clicking a quick message on the left!</p>
                  </div>
                )}
                
                <AnimatePresence>
                  {conversations.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                        <div className={`px-4 py-3 rounded-2xl ${
                          msg.role === 'user' 
                            ? 'bg-green-600 text-white rounded-br-md' 
                            : 'bg-gray-700 text-gray-100 rounded-bl-md'
                        }`}>
                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-1 text-xs text-purple-400">
                              {getAgentIcon(msg.intent)}
                              <span>Intent: {msg.intent}</span>
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'assistant' && msg.state && (
                          <p className="text-xs text-gray-500 mt-1 px-2">
                            State: {msg.state} | Action: {msg.action}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message to test AI..."
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 hover:opacity-90 transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Test All Tab */}
        {activeTab === 'test-all' && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-center mb-6">
              <button
                onClick={testAllAgents}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:opacity-90 transition-all flex items-center gap-3 mx-auto"
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <TestTube className="w-6 h-6" />
                )}
                {loading ? 'Testing...' : 'Run All 7 Agent Tests'}
              </button>
              <p className="text-gray-400 mt-2 text-sm">
                This will send test messages to each agent and show their responses
              </p>
            </div>

            {testResults && (
              <div className="space-y-4 mt-6">
                <h3 className="text-xl font-bold text-white">Test Results ({testResults.total_tests} tests)</h3>
                
                {testResults.results.map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-4 rounded-xl border ${
                      result.success 
                        ? 'bg-green-900/20 border-green-700' 
                        : 'bg-red-900/20 border-red-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-semibold flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            result.success ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {result.test_number}
                          </span>
                          {result.agent}
                        </h4>
                        <p className="text-gray-400 text-sm mt-1">
                          Input: "{result.input_message}"
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.actual_intent === result.expected_intent
                            ? 'bg-green-600/30 text-green-400'
                            : 'bg-yellow-600/30 text-yellow-400'
                        }`}>
                          Intent: {result.actual_intent}
                        </span>
                      </div>
                    </div>
                    
                    {result.ai_response && (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {result.ai_response}
                        </p>
                      </div>
                    )}
                    
                    {result.error && (
                      <p className="text-red-400 text-sm mt-2">Error: {result.error}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agents Info Tab */}
        {activeTab === 'agents' && agentsInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentsInfo.agents.map((agent, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 hover:border-purple-500 transition-all"
              >
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-sm">
                    {i + 1}
                  </span>
                  {agent.name}
                </h3>
                <p className="text-gray-400 text-sm mt-2">{agent.purpose}</p>
                
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Trigger Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.triggers.slice(0, 5).map((t, j) => (
                      <span key={j} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Example Response:</p>
                  <p className="text-gray-300 text-sm">{agent.example_response}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppAITester;
