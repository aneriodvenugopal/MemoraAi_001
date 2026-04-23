import React, { useState } from 'react';
import { aiAgentService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Home, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import AIChat from '../components/AIChat';

const AIAgents = () => {
  const [activeAgent, setActiveAgent] = useState(null);
  const [chatConfig, setChatConfig] = useState(null);

  const agents = [
    {
      id: 'property_recommendation',
      name: 'Property Recommendation AI',
      icon: Home,
      emoji: '🏠',
      description: 'Get AI-powered property recommendations based on customer preferences',
      gradient: 'from-blue-500 to-cyan-500',
      features: [
        'Smart property matching',
        'Budget-based filtering',
        'Location analysis',
        'ROI predictions'
      ],
      prompt: 'I need a 2BHK apartment in Pune under ₹50 lakhs'
    },
    {
      id: 'lead_followup',
      name: 'Lead Follow-up Assistant',
      icon: MessageSquare,
      emoji: '💬',
      description: 'Generate personalized follow-up messages for your leads',
      gradient: 'from-purple-500 to-pink-500',
      features: [
        'Personalized messages',
        'Hindi + English support',
        'WhatsApp templates',
        'Follow-up suggestions'
      ],
      prompt: 'Generate a follow-up message for a hot lead'
    },
    {
      id: 'sms_automation',
      name: 'SMS Automation Agent',
      icon: MessageSquare,
      emoji: '📱',
      description: 'Automated SMS for leads, bookings, payments, and more',
      gradient: 'from-green-500 to-emerald-500',
      features: [
        'Lead acknowledgment SMS',
        'Booking confirmations',
        'Payment reminders',
        'Hindi + English + Hinglish'
      ],
      prompt: 'Send automated SMS notifications',
      isExternal: true,
      externalLink: '/sms'
    }
  ];

  const handleStartAgent = async (agentId) => {
    try {
      let response;
      
      if (agentId === 'property_recommendation') {
        response = await aiAgentService.startPropertyRecommendation();
      } else if (agentId === 'lead_followup') {
        // For demo, we'll use property recommendation since we don't have leads
        toast.info('Lead follow-up requires active leads. Showing property recommendation instead.');
        response = await aiAgentService.startPropertyRecommendation();
      }

      if (response.success) {
        const agent = agents.find(a => a.id === agentId);
        setActiveAgent(agentId);
        setChatConfig({
          conversationId: response.conversation_id,
          sessionId: response.session_id,
          agentType: agentId,
          title: agent.name,
          initialMessage: response.message
        });
        toast.success('AI Assistant ready!');
      }
    } catch (error) {
      console.error('Failed to start agent:', error);
      toast.error(error.response?.data?.detail || 'Failed to start AI assistant');
    }
  };

  const handleSendMessage = async (message) => {
    if (activeAgent === 'property_recommendation') {
      return await aiAgentService.sendPropertyRecommendationMessage(
        chatConfig.conversationId,
        chatConfig.sessionId,
        message
      );
    } else if (activeAgent === 'lead_followup') {
      return await aiAgentService.sendLeadFollowupMessage(
        chatConfig.conversationId,
        chatConfig.sessionId,
        message
      );
    }
  };

  const handleCloseChat = () => {
    setActiveAgent(null);
    setChatConfig(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-block p-4 bg-gradient-to-r from-ocean-primary to-ocean-secondary rounded-full">
          <Bot className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
          AI Agents
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Supercharge your real estate business with AI-powered assistants. Get instant insights, recommendations, and automation.
        </p>
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          <Sparkles className="w-4 h-4 mr-2" />
          Powered by GPT-5
        </Badge>
      </div>

      {/* AI Agents Grid */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-12">
        {agents.map((agent) => (
          <Card 
            key={agent.id} 
            className="glass-card hover:shadow-2xl transition-all duration-300 border-2 hover:border-ocean-primary/50"
          >
            <CardHeader className={`bg-gradient-to-r ${agent.gradient} text-white rounded-t-lg`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-4xl backdrop-blur-sm">
                  {agent.emoji}
                </div>
                <div>
                  <CardTitle className="text-white text-xl">{agent.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    AI-Powered
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-600">{agent.description}</p>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Key Features:</h4>
                <ul className="space-y-2">
                  {agent.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-ocean-primary rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Example prompt:</p>
                <p className="text-sm text-gray-700 italic">"{agent.prompt}"</p>
              </div>

              <Button
                onClick={() => agent.isExternal ? window.location.href = agent.externalLink : handleStartAgent(agent.id)}
                disabled={activeAgent === agent.id && !agent.isExternal}
                className={`w-full bg-gradient-to-r ${agent.gradient} hover:opacity-90 text-white`}
              >
                {agent.isExternal ? (
                  <>
                    Open Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : activeAgent === agent.id ? (
                  <>
                    <Bot className="w-4 h-4 mr-2 animate-pulse" />
                    Active
                  </>
                ) : (
                  <>
                    Start Assistant
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="max-w-5xl mx-auto mt-12 border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">How it works</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Select an AI agent based on your needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Chat naturally with the AI assistant - it understands Hindi & English</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Get instant recommendations, messages, or insights powered by GPT-5</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Copy and use the AI-generated content directly in your workflow</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card className="max-w-5xl mx-auto mt-6 border-2 border-purple-200 bg-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Explore All 13 AI Agents</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Learn about all planned AI agents, their benefits, use cases, and technical implementation details.
                </p>
              </div>
            </div>
            <Button
              onClick={() => window.location.href = '/ai-agents-docs'}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
            >
              View Documentation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Component */}
      {chatConfig && (
        <AIChat
          title={chatConfig.title}
          agentType={chatConfig.agentType}
          conversationId={chatConfig.conversationId}
          sessionId={chatConfig.sessionId}
          onSendMessage={handleSendMessage}
          initialMessage={chatConfig.initialMessage}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default AIAgents;
