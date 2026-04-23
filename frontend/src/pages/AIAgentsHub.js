import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, MessageSquare, Send, CreditCard, Bell, Clock, 
  Database, Users, Phone, TrendingUp, Home, Calendar,
  Zap, Mail, DollarSign, FileText, Shield, Info, Languages,
  Volume2, VolumeX, Search, BarChart2, Target, Eye, Scale, Wrench,
  UserCheck, Leaf, MapPin, Share2, Image, Award, Network, Calculator,
  Play, Pause, Square, SkipForward, SkipBack
} from 'lucide-react';

const AIAgentsHub = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [language, setLanguage] = useState('english');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingAgentId, setSpeakingAgentId] = useState(null);
  const [speakingSection, setSpeakingSection] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [isReadingFullPage, setIsReadingFullPage] = useState(false);
  const utteranceRef = useRef(null);

  // Load available voices and select Indian female voice
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Priority order for Indian female voices
      const indianFemaleVoiceNames = [
        'Microsoft Heera',      // Windows Indian English Female
        'Google हिन्दी',         // Google Hindi
        'Lekha',                // Apple Indian
        'Veena',                // Apple Indian
        'en-IN',                // Generic Indian English
        'hi-IN',                // Hindi
      ];
      
      // Find the best Indian female voice
      let bestVoice = null;
      
      // First try to find female Indian English voice
      for (const voice of voices) {
        const voiceName = voice.name.toLowerCase();
        const voiceLang = voice.lang.toLowerCase();
        
        // Check for Indian female voices
        if ((voiceLang.includes('en-in') || voiceLang.includes('hi-in') || voiceLang.includes('te-in')) &&
            (voiceName.includes('female') || voiceName.includes('heera') || voiceName.includes('lekha') || 
             voiceName.includes('veena') || voiceName.includes('aditi') || voiceName.includes('priya') ||
             voiceName.includes('raveena') || voiceName.includes('kajal'))) {
          bestVoice = voice;
          break;
        }
      }
      
      // Fallback to any Indian voice
      if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
      }
      
      // Fallback to any female voice
      if (!bestVoice) {
        bestVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('google us english')
        );
      }
      
      // Final fallback to first available voice
      if (!bestVoice && voices.length > 0) {
        bestVoice = voices[0];
      }
      
      setSelectedVoice(bestVoice);
    };

    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Enhanced Text-to-Speech functionality with Indian female voice
  const speakText = useCallback((text, agentId = null, section = null, onEnd = null) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Use selected voice (preferably Indian female)
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Set language based on selection
      if (language === 'telugu') {
        utterance.lang = 'te-IN';
      } else if (language === 'hindi') {
        utterance.lang = 'hi-IN';
      } else {
        utterance.lang = 'en-IN'; // Indian English
      }
      
      // Natural speaking rate and pitch for female voice
      utterance.rate = 0.92;
      utterance.pitch = 1.1; // Slightly higher pitch for female voice
      utterance.volume = 1;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setSpeakingAgentId(agentId);
        setSpeakingSection(section);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingAgentId(null);
        setSpeakingSection(null);
        if (onEnd) onEnd();
      };
      
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingAgentId(null);
        setSpeakingSection(null);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in your browser');
    }
  }, [selectedVoice, language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingAgentId(null);
      setSpeakingSection(null);
      setIsReadingFullPage(false);
    }
  }, []);

  const pauseSpeaking = useCallback(() => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking]);

  const resumeSpeaking = useCallback(() => {
    if ('speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  // Generate full agent text for reading
  const generateAgentFullText = useCallback((agent) => {
    let text = `${agent.name}. ${agent.shortDescription}. `;
    text += `Key Benefits: ${agent.benefits.join('. ')}. `;
    text += `Use Cases: `;
    agent.useCases.forEach((uc, idx) => {
      text += `${idx + 1}. ${uc.title}. ${uc.description} `;
    });
    text += `Technical Details: Provider is ${agent.technicalDetails.provider}. `;
    text += `Features include: ${agent.technicalDetails.features.join(', ')}. `;
    text += `Integration: ${agent.technicalDetails.integration}.`;
    return text;
  }, []);

  // Read single agent with section
  const handleSpeakAgentSection = useCallback((agent, section) => {
    if (isSpeaking && speakingAgentId === agent.id && speakingSection === section) {
      stopSpeaking();
      return;
    }

    let textToSpeak = '';
    switch (section) {
      case 'overview':
        textToSpeak = `${agent.name}. ${agent.shortDescription}`;
        break;
      case 'benefits':
        textToSpeak = `Key Benefits of ${agent.name}: ${agent.benefits.join('. ')}`;
        break;
      case 'usecases':
        textToSpeak = `Use Cases for ${agent.name}: `;
        agent.useCases.forEach((uc, idx) => {
          textToSpeak += `${idx + 1}. ${uc.title}. ${uc.description} `;
        });
        break;
      case 'technical':
        textToSpeak = `Technical Details: Provider is ${agent.technicalDetails.provider}. `;
        textToSpeak += `Features: ${agent.technicalDetails.features.join(', ')}. `;
        textToSpeak += `Integration: ${agent.technicalDetails.integration}.`;
        break;
      case 'full':
      default:
        textToSpeak = generateAgentFullText(agent);
        break;
    }

    speakText(textToSpeak, agent.id, section);
  }, [isSpeaking, speakingAgentId, speakingSection, stopSpeaking, speakText, generateAgentFullText]);

  // Read full page - all agents sequentially
  const readFullPage = useCallback((agents, startIndex = 0) => {
    if (startIndex >= agents.length) {
      setIsReadingFullPage(false);
      stopSpeaking();
      return;
    }

    setIsReadingFullPage(true);
    setCurrentAgentIndex(startIndex);
    
    const agent = agents[startIndex];
    const text = generateAgentFullText(agent);
    
    speakText(text, agent.id, 'full', () => {
      // Read next agent after current one finishes
      readFullPage(agents, startIndex + 1);
    });
  }, [generateAgentFullText, speakText, stopSpeaking]);

  const handleSpeakAgent = useCallback((agent) => {
    if (isSpeaking && speakingAgentId === agent.id) {
      stopSpeaking();
    } else {
      const textToSpeak = `${agent.name}. ${agent.shortDescription}. Key benefits: ${agent.benefits.slice(0, 3).join('. ')}`;
      speakText(textToSpeak, agent.id);
    }
  }, [isSpeaking, speakingAgentId, stopSpeaking, speakText]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const aiAgents = [
    {
      id: 'sms-agent',
      name: 'SMS Automation Agent',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600',
      status: 'coming_soon',
      shortDescription: 'Automated SMS sending for leads, follow-ups, payment reminders, and notifications',
      benefits: [
        'Instant lead acknowledgment SMS within seconds of inquiry',
        'Automated follow-up reminders to sales team',
        'Payment due date reminders to customers',
        'Booking confirmation SMS',
        'Site visit appointment reminders',
        'OTP for secure authentication'
      ],
      useCases: [
        {
          title: 'Lead Follow-up Automation',
          description: 'When a new lead is created, automatically send welcome SMS with project details and schedule follow-up SMS series (Day 1, Day 3, Day 7) until lead responds or converts.'
        },
        {
          title: 'Payment Collection',
          description: 'Send automated reminders 7 days before EMI due date, on due date, and after due date with payment link. Reduces default rates by 40%.'
        },
        {
          title: 'Site Visit Coordination',
          description: 'Send SMS with Google Maps link, contact person details, and timing 1 day before scheduled site visit. Reduces no-shows by 60%.'
        }
      ],
      technicalDetails: {
        provider: 'MSG91 / Twilio',
        features: [
          'Template-based messaging',
          'Delivery reports tracking',
          'Failed message retry logic',
          'Cost optimization (send only during business hours)',
          'Multi-language support (English, Telugu, Hindi)',
          'Character count optimization'
        ],
        integration: 'Integrated with Lead Management, Booking System, Payment Schedules'
      }
    },
    {
      id: 'whatsapp-agent',
      name: 'WhatsApp Business Agent',
      icon: Send,
      color: 'from-green-500 to-green-600',
      status: 'coming_soon',
      shortDescription: 'Rich media messaging via WhatsApp for project brochures, property videos, and customer engagement',
      benefits: [
        'Send project brochures with images and PDFs',
        'Share property videos and virtual tours',
        'Higher engagement rate (98% open rate vs 20% for email)',
        'Two-way conversation support',
        'Status updates with images (construction progress)',
        'Interactive buttons for quick responses'
      ],
      useCases: [
        {
          title: 'Project Marketing',
          description: 'Send beautifully formatted project brochures with images, floor plans, amenities, pricing, and location map. Include CTA buttons for "Schedule Visit" or "Talk to Expert".'
        },
        {
          title: 'Lead Nurturing',
          description: 'Share relevant property options based on lead budget and preferences. Send personalized messages with property images, area details, and pricing. Track which properties lead showed interest in.'
        },
        {
          title: 'Customer Updates',
          description: 'Send construction progress updates with photos to booked customers every month. Share possession date updates, documentation reminders, and legal completion milestones.'
        }
      ],
      technicalDetails: {
        provider: 'WhatsApp Business API',
        features: [
          'Rich media support (images, videos, PDFs)',
          'Template messages with variables',
          'Interactive buttons and lists',
          'Read receipts and delivery status',
          'Session-based conversations',
          '24-hour message window after user response'
        ],
        integration: 'Integrated with CRM, Property Listings, Document Management'
      }
    },
    {
      id: 'payment-agent',
      name: 'Payment Collection Agent',
      icon: CreditCard,
      color: 'from-purple-500 to-purple-600',
      status: 'coming_soon',
      shortDescription: 'Intelligent payment reminder and collection system with automated follow-ups',
      benefits: [
        'Reduce payment defaults by 50%',
        'Automated multi-channel reminders (SMS, WhatsApp, Email)',
        'Payment link generation and tracking',
        'Escalation to sales team for overdue payments',
        'Early payment incentive notifications',
        'Automated receipt generation and delivery'
      ],
      useCases: [
        {
          title: 'EMI Collection Automation',
          description: 'For customers with EMI plans: Send reminder 7 days before due date, on due date (morning), and 3 days after due date with payment link. Escalate to sales manager if payment pending for 7+ days.'
        },
        {
          title: 'Booking Amount Collection',
          description: 'For leads who showed interest but haven\'t paid booking amount: Send personalized reminder with limited-time offers, property blocking alert, and easy payment options. Convert 30% of interested leads to bookings.'
        },
        {
          title: 'Early Payment Incentives',
          description: 'Identify customers who consistently pay on time and send automated messages about early payment discounts or loyalty benefits. Improve cash flow by encouraging advance payments.'
        }
      ],
      technicalDetails: {
        provider: 'Razorpay / Paytm / PhonePe',
        features: [
          'Payment link generation',
          'Multiple payment methods (UPI, Cards, Net Banking)',
          'Automatic payment status updates',
          'Webhook integration for real-time notifications',
          'Failed payment retry logic',
          'Refund management'
        ],
        integration: 'Integrated with Booking System, Payment Schedules, SMS/WhatsApp Agents'
      }
    },
    {
      id: 'notification-agent',
      name: 'In-App Notification Agent',
      icon: Bell,
      color: 'from-red-500 to-red-600',
      status: 'coming_soon',
      shortDescription: 'Real-time push notifications for critical business events and updates',
      benefits: [
        'Instant alerts for new leads (within 1 minute)',
        'Site visit booking notifications',
        'Payment received confirmations',
        'Task deadline reminders',
        'Team collaboration updates',
        'Priority notifications for urgent actions'
      ],
      useCases: [
        {
          title: 'Lead Alert System',
          description: 'When a new lead comes from website or walk-in, instantly notify available sales agents with lead details, source, and quick action buttons to call or assign. Reduce response time from 2 hours to 2 minutes.'
        },
        {
          title: 'Manager Escalations',
          description: 'Automatically escalate and notify managers when: Lead pending for 24+ hours, Payment overdue by 7+ days, Customer complaint registered, or Staff missing targets. Enable faster decision-making.'
        },
        {
          title: 'Customer Journey Tracking',
          description: 'Notify relevant team members at each stage: Lead created → Sales Agent, Site visit booked → Site coordinator, Booking done → Accounts team, Payment due → Collections team. Ensure no customer falls through cracks.'
        }
      ],
      technicalDetails: {
        provider: 'Firebase Cloud Messaging / OneSignal',
        features: [
          'Real-time push notifications',
          'In-app notification center',
          'Priority levels (urgent, high, medium, low)',
          'Click actions (deep linking)',
          'Notification history and read status',
          'User preference management'
        ],
        integration: 'Integrated with all modules - Leads, Bookings, Payments, Tasks'
      }
    },
    {
      id: 'followup-agent',
      name: 'Lead Follow-up Automation Agent',
      icon: Users,
      color: 'from-indigo-500 to-orange-600',
      status: 'coming_soon',
      shortDescription: 'Intelligent follow-up scheduler and reminder system for lead nurturing',
      benefits: [
        'Never miss a follow-up (100% adherence)',
        'Intelligent follow-up frequency based on lead quality',
        'Multi-channel follow-ups (Call, SMS, WhatsApp, Email)',
        'Auto-assign follow-ups to available agents',
        'Predictive conversion scoring',
        'Follow-up outcome tracking and optimization'
      ],
      useCases: [
        {
          title: 'Automated Follow-up Sequences',
          description: 'Create smart follow-up sequences based on lead source and quality: Hot leads (5-star) → Call same day, SMS next day, WhatsApp day 3. Warm leads → SMS day 1, Call day 3, Email day 5. Cold leads → Email day 1, SMS day 7. Adjust based on response.'
        },
        {
          title: 'Lead Scoring & Prioritization',
          description: 'AI analyzes lead behavior (opens SMS, clicks links, visits website) and assigns priority score. High-priority leads get more frequent, personalized follow-ups. Low-priority leads get automated nurture campaigns.'
        },
        {
          title: 'Conversion Prediction',
          description: 'Based on historical data, predict likelihood of conversion for each lead. Focus agent time on high-probability leads. Send automated campaigns to low-probability leads until they show interest signals.'
        }
      ],
      technicalDetails: {
        provider: 'Custom AI Engine',
        features: [
          'ML-based lead scoring',
          'Automated task creation',
          'Multi-channel sequencing',
          'Response tracking and optimization',
          'A/B testing for message templates',
          'Agent workload balancing'
        ],
        integration: 'Integrated with CRM, SMS Agent, WhatsApp Agent, Email Agent'
      }
    },
    {
      id: 'resale-agent',
      name: 'Resale Automation Agent',
      icon: Home,
      color: 'from-teal-500 to-teal-600',
      status: 'coming_soon',
      shortDescription: 'Automated resale property matching and notification system',
      benefits: [
        'Match resale properties with buyer leads automatically',
        'Notify property owners when matching buyer found',
        'Send resale property alerts to relevant leads',
        'Calculate market-rate pricing suggestions',
        'Track resale listing performance',
        'Automate resale commission calculations'
      ],
      useCases: [
        {
          title: 'Buyer-Seller Matching',
          description: 'When a customer submits resale request for their property, AI agent automatically searches for matching buyer leads based on budget, location, property type. Sends notifications to both parties with match details.'
        },
        {
          title: 'Resale Opportunity Alerts',
          description: 'Analyze booking patterns and identify customers likely to resell within 2-3 years. Proactively reach out with resale services before they approach competitors. Capture 40% more resale inventory.'
        },
        {
          title: 'Market Price Recommendations',
          description: 'AI analyzes recent sales in project, location trends, property condition, and market demand to suggest optimal resale price. Helps customers price competitively and sell faster.'
        }
      ],
      technicalDetails: {
        provider: 'Custom AI Engine + Market Data APIs',
        features: [
          'Property matching algorithm',
          'Price suggestion engine',
          'Automated listing creation',
          'Lead notification system',
          'Performance analytics',
          'Commission calculator'
        ],
        integration: 'Integrated with Customer Portal, Lead Management, Property Listings'
      }
    },
    {
      id: 'cron-agent',
      name: 'Background Jobs Agent',
      icon: Clock,
      color: 'from-indigo-500 to-indigo-600',
      status: 'coming_soon',
      shortDescription: 'Scheduled tasks and background processes for automated operations',
      benefits: [
        'Daily automated reports to management',
        'Monthly payment schedule generation',
        'Auto-archive old leads and clean database',
        'Generate and send MIS reports',
        'Update property availability status',
        'Calculate and update commission amounts'
      ],
      useCases: [
        {
          title: 'Daily Business Reports',
          description: 'Every morning at 9 AM, generate and send WhatsApp/Email with: Yesterday\'s leads, New bookings, Pending follow-ups, Overdue payments, Team performance. Helps management stay informed without manual reporting.'
        },
        {
          title: 'Monthly Payment Schedule',
          description: 'On 1st of every month, automatically generate payment schedules for all EMI customers for next 30 days. Send SMS reminders to customers. Create tasks for collection team. Update dashboard with upcoming collections.'
        },
        {
          title: 'Data Cleanup & Archival',
          description: 'Every weekend, automatically: Archive leads older than 90 days with no activity, Remove duplicate entries, Clean up invalid phone numbers, Optimize database indexes. Keeps system fast and organized.'
        }
      ],
      technicalDetails: {
        provider: 'Celery / APScheduler',
        features: [
          'Cron-based scheduling',
          'Recurring tasks management',
          'Failed job retry mechanism',
          'Job queue monitoring',
          'Performance optimization',
          'Error notifications'
        ],
        integration: 'Integrated with all backend modules'
      }
    },
    {
      id: 'backup-agent',
      name: 'Automated Backup Agent',
      icon: Database,
      color: 'from-gray-700 to-gray-800',
      status: 'coming_soon',
      shortDescription: 'Automated database backup and disaster recovery system',
      benefits: [
        'Daily automated backups (zero data loss)',
        'Cloud storage for redundancy',
        'One-click restore capability',
        'Version history (restore to any date)',
        'Encrypted backups for security',
        'Backup health monitoring'
      ],
      useCases: [
        {
          title: 'Daily Incremental Backups',
          description: 'Every night at 2 AM, automatically backup all database changes from last 24 hours. Store on AWS S3 with 30-day retention. Send confirmation email to admin with backup size and status.'
        },
        {
          title: 'Disaster Recovery',
          description: 'In case of system crash or data corruption, restore entire database to last known good state within 15 minutes. Minimize business downtime and data loss. Tested recovery process monthly.'
        },
        {
          title: 'Audit Trail & Compliance',
          description: 'Maintain backup logs for audit purposes. Generate monthly reports showing all backups, restores, and data changes. Essential for ISO certification and regulatory compliance.'
        }
      ],
      technicalDetails: {
        provider: 'MongoDB Atlas Backup / AWS S3',
        features: [
          'Automated incremental backups',
          'Cloud storage (AWS S3 / Google Cloud)',
          'Point-in-time recovery',
          'Encryption at rest',
          'Backup verification',
          'Retention policy management'
        ],
        integration: 'Integrated with MongoDB, File Storage'
      }
    },
    {
      id: 'email-agent',
      name: 'Email Marketing Agent',
      icon: Mail,
      color: 'from-cyan-500 to-cyan-600',
      status: 'coming_soon',
      shortDescription: 'Automated email campaigns for lead nurturing and customer engagement',
      benefits: [
        'Professional email templates',
        'Drip campaigns for lead nurturing',
        'Newsletter automation',
        'Event invitation emails',
        'Personalized email content',
        'Open rate and click tracking'
      ],
      useCases: [
        {
          title: 'Lead Nurture Campaigns',
          description: 'Create email drip sequences: Email 1 (Welcome + Project Overview), Email 2 (Amenities + Location Benefits), Email 3 (Pricing + Payment Plans), Email 4 (Customer Testimonials), Email 5 (Limited Time Offer). Send over 14 days with personalized content.'
        },
        {
          title: 'Monthly Newsletters',
          description: 'Automatically compile monthly newsletter with: New property launches, Construction updates with photos, Market insights, Customer success stories, Upcoming events. Send to all leads and customers to stay top-of-mind.'
        },
        {
          title: 'Event Marketing',
          description: 'Organize property exhibitions, site visit drives, or customer appreciation events. Send professional invitation emails with RSVP tracking, calendar invites, and venue details. Follow up with reminder emails.'
        }
      ],
      technicalDetails: {
        provider: 'SendGrid / Mailgun',
        features: [
          'Drag-and-drop email builder',
          'Template library',
          'Personalization variables',
          'A/B testing',
          'Analytics dashboard',
          'Spam score checking'
        ],
        integration: 'Integrated with CRM, Event Management'
      }
    },
    {
      id: 'analytics-agent',
      name: 'Business Intelligence Agent',
      icon: TrendingUp,
      color: 'from-pink-500 to-pink-600',
      status: 'coming_soon',
      shortDescription: 'AI-powered insights and predictive analytics for business decisions',
      benefits: [
        'Predict monthly sales revenue',
        'Identify best-performing sales agents',
        'Forecast inventory sell-out dates',
        'Optimize pricing strategies',
        'Lead source ROI analysis',
        'Customer lifetime value prediction'
      ],
      useCases: [
        {
          title: 'Sales Forecasting',
          description: 'Based on historical data, current pipeline, and market trends, predict next 3 months sales with 85% accuracy. Help management plan inventory, adjust pricing, and allocate marketing budget. Update forecast weekly.'
        },
        {
          title: 'Agent Performance Optimization',
          description: 'Analyze each agent\'s performance: Leads assigned vs converted, Average deal size, Time to conversion, Customer satisfaction. Identify top performers and training needs. Suggest lead assignment optimization.'
        },
        {
          title: 'Marketing ROI Analysis',
          description: 'Track cost per lead for each marketing channel (Facebook Ads, Google Ads, Newspaper, Hoarding, Referral). Calculate conversion rate and revenue per channel. Recommend budget reallocation to maximize ROI.'
        }
      ],
      technicalDetails: {
        provider: 'Custom Analytics Engine',
        features: [
          'Predictive modeling',
          'Trend analysis',
          'Cohort analysis',
          'Funnel optimization',
          'Custom dashboards',
          'Automated insights'
        ],
        integration: 'Integrated with all data sources'
      }
    },
    {
      id: 'voice-agent',
      name: 'Voice Call Automation Agent',
      icon: Phone,
      color: 'from-blue-500 to-blue-600',
      status: 'coming_soon',
      shortDescription: 'AI voice assistant for automated calling and IVR systems',
      benefits: [
        'Automated lead qualification calls',
        'IVR for incoming customer inquiries',
        'Appointment scheduling via voice',
        'Payment reminder calls',
        'Survey and feedback collection',
        'Call recording and transcription'
      ],
      useCases: [
        {
          title: 'Lead Qualification Calls',
          description: 'AI voice agent calls new leads within 5 minutes, qualifies them with scripted questions (budget, timeline, property type), and books site visit for qualified leads. Handles 100+ calls per hour, never misses a lead.'
        },
        {
          title: 'Payment Reminder Calls',
          description: 'For overdue payments, AI makes polite reminder calls asking about payment status, offers to send payment link via SMS, and schedules callback if customer requests. Escalates to human agent only if needed.'
        },
        {
          title: 'Customer Satisfaction Surveys',
          description: 'After property handover, AI calls customers for satisfaction survey, collects ratings and feedback, identifies issues needing resolution, and generates detailed reports for management. 10x faster than manual surveys.'
        }
      ],
      technicalDetails: {
        provider: 'Twilio Voice / Exotel',
        features: [
          'Text-to-speech (TTS)',
          'Speech recognition',
          'Call routing',
          'IVR flows',
          'Call recording',
          'Sentiment analysis'
        ],
        integration: 'Integrated with CRM, Booking System'
      }
    },
    {
      id: 'document-agent',
      name: 'Document Processing Agent',
      icon: FileText,
      color: 'from-blue-600 to-blue-700',
      status: 'coming_soon',
      shortDescription: 'Automated document generation, verification, and management',
      benefits: [
        'Auto-generate booking agreements',
        'Create payment receipts instantly',
        'KYC document verification',
        'Legal document templates',
        'Digital signature integration',
        'Document search and retrieval'
      ],
      useCases: [
        {
          title: 'Agreement Generation',
          description: 'When booking is confirmed, automatically generate personalized sale agreement with customer details, property specifications, payment terms, legal clauses. Send for digital signature via DigiSign/DocuSign. Store signed copy in cloud.'
        },
        {
          title: 'KYC Verification',
          description: 'Customer uploads Aadhaar, PAN, Address proof. AI agent extracts information, validates against government databases, checks for discrepancies, and approves/rejects KYC within 2 minutes. Reduces fraud and manual effort.'
        },
        {
          title: 'Receipt Automation',
          description: 'For every payment received, instantly generate professional receipt PDF with company letterhead, payment details, GST breakdown, and QR code. Email and WhatsApp to customer automatically. Store in customer portal.'
        }
      ],
      technicalDetails: {
        provider: 'Custom + Cloud Storage',
        features: [
          'Template engine',
          'PDF generation',
          'OCR for document reading',
          'Digital signature integration',
          'Version control',
          'Cloud storage (AWS S3)'
        ],
        integration: 'Integrated with Booking System, Payments, Customer Portal'
      }
    },
    {
      id: 'security-agent',
      name: 'Security & Compliance Agent',
      icon: Shield,
      color: 'from-red-600 to-red-700',
      status: 'coming_soon',
      shortDescription: 'Automated security monitoring and compliance management',
      benefits: [
        'Real-time threat detection',
        'Suspicious activity alerts',
        'Data access monitoring',
        'Compliance report generation',
        'Password policy enforcement',
        'Audit trail maintenance'
      ],
      useCases: [
        {
          title: 'Fraud Detection',
          description: 'Monitor for suspicious patterns: Multiple bookings from same IP, Unusual payment patterns, Fake document uploads, Repeated failed login attempts. Alert security team immediately and auto-block if high-risk behavior detected.'
        },
        {
          title: 'Data Privacy Compliance',
          description: 'Ensure GDPR and data protection compliance: Auto-expire old customer data, Anonymize personal information in reports, Maintain consent records, Generate compliance reports for audits. Avoid legal penalties.'
        },
        {
          title: 'Access Control Monitoring',
          description: 'Track who accessed what data and when: Alert if staff accesses customer data outside working hours, Flag if sensitive documents downloaded to personal devices, Maintain complete audit trail for regulatory compliance.'
        }
      ],
      technicalDetails: {
        provider: 'Custom Security Engine',
        features: [
          'Anomaly detection',
          'Access logging',
          'Encryption management',
          'Compliance dashboards',
          'Alert system',
          'Incident response'
        ],
        integration: 'Integrated with all modules at security layer'
      }
    }
  ];

  const handleViewDetails = (agent) => {
    setSelectedAgent(agent);
    setShowInfoModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      coming_soon: { label: 'Coming Soon', color: 'bg-blue-500' },
      active: { label: 'Active', color: 'bg-green-500' },
      beta: { label: 'Beta', color: 'bg-blue-500' },
      planned: { label: 'Planned', color: 'bg-gray-500' }
    };
    const config = statusConfig[status] || statusConfig.planned;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Agents Hub
                </h1>
                <p className="text-gray-600 mt-1">
                  Intelligent automation agents to supercharge your real estate business
                </p>
              </div>
            </div>
            
            {/* Global TTS Controls */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-700">🎧 Listen to Documentation</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadingFullPage ? (
                    <Button
                      size="sm"
                      onClick={() => readFullPage(aiAgents, 0)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 text-white text-xs"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Read All
                    </Button>
                  ) : (
                    <>
                      {isPaused ? (
                        <Button
                          size="sm"
                          onClick={resumeSpeaking}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={pauseSpeaking}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        >
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={stopSpeaking}
                        className="text-xs"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>
                {isReadingFullPage && (
                  <div className="mt-2 text-xs text-indigo-600">
                    📖 Reading: {currentAgentIndex + 1} of {aiAgents.length}
                  </div>
                )}
                {selectedVoice && (
                  <div className="mt-1 text-xs text-gray-500">
                    🗣️ Voice: {selectedVoice.name.substring(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Documentation Phase</p>
                <p className="text-sm text-blue-700 mt-1">
                  ప్రతి AI Agent పక్కన <Info className="w-4 h-4 inline" /> icon click చేసి detailed information చూడండి. 
                  Implementation తర్వాత confirm చేసిన తర్వాత start అవుతుంది.
                </p>
              </div>
            </div>
          </div>

          {/* Link to Interactive AI Agents */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Try Our Live AI Agents!</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Property Recommendation & Lead Follow-up agents are now live with GPT-5
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/ai-agents'}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white"
              >
                Launch AI Agents
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiAgents.map((agent) => {
            const IconComponent = agent.icon;
            const isCurrentlySpeaking = isSpeaking && speakingAgentId === agent.id;
            return (
              <Card key={agent.id} className={`glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 ${isCurrentlySpeaking ? 'ring-2 ring-indigo-400 ring-opacity-50' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${agent.color} shadow-lg ${isCurrentlySpeaking ? 'animate-pulse' : ''}`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{agent.name}</CardTitle>
                        {getStatusBadge(agent.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* TTS Button for Card */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`rounded-full w-8 h-8 p-0 ${isCurrentlySpeaking ? 'bg-indigo-100' : ''}`}
                        onClick={() => handleSpeakAgent(agent)}
                        title={isCurrentlySpeaking ? "Stop reading" : "Listen to this agent"}
                      >
                        {isCurrentlySpeaking ? (
                          <VolumeX className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-indigo-400 hover:text-indigo-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full w-8 h-8 p-0"
                        onClick={() => handleViewDetails(agent)}
                      >
                        <Info className="w-5 h-5 text-ocean-primary" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{agent.shortDescription}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">Key Benefits:</p>
                      {/* Section TTS control */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 py-0 text-xs text-indigo-500 hover:text-indigo-700"
                        onClick={() => handleSpeakAgentSection(agent, 'benefits')}
                      >
                        {isSpeaking && speakingAgentId === agent.id && speakingSection === 'benefits' ? (
                          <><VolumeX className="w-3 h-3 mr-1" /> Stop</>
                        ) : (
                          <><Volume2 className="w-3 h-3 mr-1" /> Listen</>
                        )}
                      </Button>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {agent.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Zap className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    {agent.benefits.length > 3 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => handleViewDetails(agent)}
                      >
                        +{agent.benefits.length - 3} more benefits
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coming Soon Banner */}
        <div className="mt-12 glass-card p-8 text-center">
          <Bot className="w-16 h-16 mx-auto text-purple-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">More AI Agents Coming Soon!</h3>
          <p className="text-gray-600 mb-4">
            మీ business requirements ఆధారంగా మరిన్ని intelligent automation agents add చేస్తాము.
          </p>
          <p className="text-sm text-gray-500">
            Questions or custom agent requirements? Contact support team.
          </p>
        </div>
      </div>

      {/* Detailed Info Modal */}
      <Dialog open={showInfoModal} onOpenChange={(open) => {
        setShowInfoModal(open);
        if (!open) stopSpeaking(); // Stop speaking when modal closes
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAgent && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {React.createElement(selectedAgent.icon, { 
                      className: `w-8 h-8 bg-gradient-to-br ${selectedAgent.color} text-white p-1.5 rounded-lg` 
                    })}
                    <div>
                      <DialogTitle className="text-2xl">{selectedAgent.name}</DialogTitle>
                      <p className="text-sm text-gray-600 mt-1">{selectedAgent.shortDescription}</p>
                    </div>
                  </div>
                  {/* Modal TTS Controls */}
                  <div className="flex items-center gap-2 bg-indigo-50 rounded-lg p-2">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    {isSpeaking && speakingAgentId === selectedAgent.id ? (
                      <>
                        {isPaused ? (
                          <Button size="sm" onClick={resumeSpeaking} className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            <Play className="w-3 h-3 mr-1" /> Resume
                          </Button>
                        ) : (
                          <Button size="sm" onClick={pauseSpeaking} className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                            <Pause className="w-3 h-3 mr-1" /> Pause
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={stopSpeaking} className="text-xs">
                          <Square className="w-3 h-3 mr-1" /> Stop
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleSpeakAgentSection(selectedAgent, 'full')}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
                      >
                        <Play className="w-3 h-3 mr-1" /> Read All
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Benefits Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Major Benefits to Real Estate Business
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs ${isSpeaking && speakingSection === 'benefits' ? 'bg-green-100 border-green-400' : ''}`}
                      onClick={() => handleSpeakAgentSection(selectedAgent, 'benefits')}
                    >
                      {isSpeaking && speakingAgentId === selectedAgent.id && speakingSection === 'benefits' ? (
                        <><VolumeX className="w-3 h-3 mr-1" /> Stop</>
                      ) : (
                        <><Volume2 className="w-3 h-3 mr-1" /> Listen</>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAgent.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Cases Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Real-World Use Cases
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs ${isSpeaking && speakingSection === 'usecases' ? 'bg-blue-100 border-blue-400' : ''}`}
                      onClick={() => handleSpeakAgentSection(selectedAgent, 'usecases')}
                    >
                      {isSpeaking && speakingAgentId === selectedAgent.id && speakingSection === 'usecases' ? (
                        <><VolumeX className="w-3 h-3 mr-1" /> Stop</>
                      ) : (
                        <><Volume2 className="w-3 h-3 mr-1" /> Listen</>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {selectedAgent.useCases.map((useCase, idx) => (
                      <Card key={idx} className="border-l-4 border-blue-500">
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-blue-900 mb-2">{useCase.title}</h4>
                          <p className="text-sm text-gray-700">{useCase.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Technical Details Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      Technical Implementation Details
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs ${isSpeaking && speakingSection === 'technical' ? 'bg-purple-100 border-purple-400' : ''}`}
                      onClick={() => handleSpeakAgentSection(selectedAgent, 'technical')}
                    >
                      {isSpeaking && speakingAgentId === selectedAgent.id && speakingSection === 'technical' ? (
                        <><VolumeX className="w-3 h-3 mr-1" /> Stop</>
                      ) : (
                        <><Volume2 className="w-3 h-3 mr-1" /> Listen</>
                      )}
                    </Button>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Service Provider:</p>
                      <p className="text-sm text-gray-700">{selectedAgent.technicalDetails.provider}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900 mb-2">Features:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedAgent.technicalDetails.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Integration Points:</p>
                      <p className="text-sm text-gray-700">{selectedAgent.technicalDetails.integration}</p>
                    </div>
                  </div>
                </div>

                {/* Status Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Implementation Status</p>
                  </div>
                  <p className="text-sm text-blue-800">
                    This agent is currently in <strong>documentation phase</strong>. 
                    Implementation will begin after your review and confirmation. 
                    Estimated development time: 2-3 weeks.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAgentsHub;
