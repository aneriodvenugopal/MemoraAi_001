import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, FileText, Download, Loader2, 
  CheckCircle, RefreshCw, Sparkles, Play,
  Building2, Users, CreditCard, BarChart3,
  MessageSquare, Calendar, Shield, Cpu,
  TrendingUp, Globe, Smartphone, Bot, Mic, Volume2,
  Presentation, Upload, Image, Copy, Eye, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '../services/api';

// 2026 Indian Real Estate Market - AI Era Categories & Concepts
const DEMO_CATEGORIES = [
  {
    id: 'proptech_foundation',
    name: '🏗️ PropTech Foundation',
    icon: Building2,
    description: 'Core digital infrastructure for modern real estate',
    concepts: [
      { id: 'PF01', title: 'Digital Property Management System', subtitle: 'Centralized project & property database' },
      { id: 'PF02', title: 'Smart Layout & Plot Mapping', subtitle: 'Interactive plot visualization with real-time status' },
      { id: 'PF03', title: 'Multi-Project Portfolio Management', subtitle: 'Manage multiple ventures from single dashboard' },
      { id: 'PF04', title: 'Property Gallery & Virtual Tours', subtitle: 'Rich media showcase with YouTube integration' },
      { id: 'PF05', title: 'Geo-Tagged Property Locations', subtitle: 'Google Maps integration for site navigation' },
    ]
  },
  {
    id: 'ai_sales_marketing',
    name: '🤖 AI-Powered Sales & Marketing',
    icon: Bot,
    description: 'Intelligent automation for lead conversion',
    concepts: [
      { id: 'AI01', title: 'AI Lead Scoring & Prioritization', subtitle: 'ML-based hot lead identification' },
      { id: 'AI02', title: 'Automated Follow-up Sequences', subtitle: 'Smart drip campaigns via SMS/WhatsApp' },
      { id: 'AI03', title: 'Marketing Agent Performance Analytics', subtitle: 'AI insights on agent productivity' },
      { id: 'AI04', title: 'Predictive Sales Forecasting', subtitle: 'Revenue prediction using historical data' },
      { id: 'AI05', title: 'AI Video Content Generation', subtitle: 'TutorAI for educational marketing videos' },
      { id: 'AI06', title: 'Smart Customer Segmentation', subtitle: 'Auto-categorize leads by buying intent' },
    ]
  },
  {
    id: 'customer_experience',
    name: '✨ Smart Customer Experience',
    icon: Users,
    description: 'Digital-first customer journey',
    concepts: [
      { id: 'CX01', title: 'Public Layout Sharing Portal', subtitle: 'Shareable links for plot availability' },
      { id: 'CX02', title: 'Real-Time Plot Status Updates', subtitle: 'Live availability without page refresh' },
      { id: 'CX03', title: 'Self-Service Booking System', subtitle: 'Online plot reservation workflow' },
      { id: 'CX04', title: 'Customer Payment Dashboard', subtitle: 'Track EMIs, receipts & payment history' },
      { id: 'CX05', title: 'Site Visit Self-Scheduling', subtitle: 'Calendar-based appointment booking' },
      { id: 'CX06', title: 'Document Download Center', subtitle: 'Agreements, receipts, legal docs access' },
    ]
  },
  {
    id: 'fintech_integration',
    name: '💳 FinTech & Payment Solutions',
    icon: CreditCard,
    description: 'Seamless digital payment ecosystem',
    concepts: [
      { id: 'FT01', title: 'Multi-Gateway Payment Processing', subtitle: 'Stripe, Razorpay, PayU integration' },
      { id: 'FT02', title: 'EMI & Installment Tracking', subtitle: 'Automated payment schedule management' },
      { id: 'FT03', title: 'Payment Reminder Automation', subtitle: 'SMS/Email alerts for due payments' },
      { id: 'FT04', title: 'Bank Account Reconciliation', subtitle: 'Multi-account financial tracking' },
      { id: 'FT05', title: 'Digital Receipt Generation', subtitle: 'Instant payment acknowledgments' },
      { id: 'FT06', title: 'Revenue Analytics Dashboard', subtitle: 'Collection reports & projections' },
    ]
  },
  {
    id: 'compliance_transparency',
    name: '🛡️ RERA Compliance & Transparency',
    icon: Shield,
    description: 'Regulatory adherence & trust building',
    concepts: [
      { id: 'CT01', title: 'DLT-Approved SMS Templates', subtitle: 'TRAI compliant transactional messaging' },
      { id: 'CT02', title: 'Legal Document Management', subtitle: 'Agreement templates & e-signatures' },
      { id: 'CT03', title: 'Booking Transparency Trail', subtitle: 'Complete audit log of transactions' },
      { id: 'CT04', title: 'Customer KYC & Verification', subtitle: 'Digital identity verification workflow' },
      { id: 'CT05', title: 'Handover Documentation', subtitle: 'Possession & registry process tracking' },
    ]
  },
  {
    id: 'omnichannel_communication',
    name: '📱 Omnichannel Communication',
    icon: MessageSquare,
    description: 'Unified customer touchpoints',
    concepts: [
      { id: 'OC01', title: 'WhatsApp Business Integration', subtitle: 'Automated replies & broadcast messages' },
      { id: 'OC02', title: 'SMS Campaign Management', subtitle: 'Bulk SMS with DLT compliance' },
      { id: 'OC03', title: 'Email Notification System', subtitle: 'Transactional & marketing emails' },
      { id: 'OC04', title: 'Web Push Notifications', subtitle: 'Browser-based instant alerts' },
      { id: 'OC05', title: 'In-App Notification Center', subtitle: 'Centralized message inbox' },
    ]
  },
  {
    id: 'analytics_insights',
    name: '📊 Data Analytics & Insights',
    icon: BarChart3,
    description: 'Business intelligence for growth',
    concepts: [
      { id: 'DA01', title: 'Executive Dashboard Overview', subtitle: 'KPIs at a glance for leadership' },
      { id: 'DA02', title: 'Sales Pipeline Analytics', subtitle: 'Lead-to-booking conversion funnel' },
      { id: 'DA03', title: 'Agent Performance Reports', subtitle: 'Individual & team productivity metrics' },
      { id: 'DA04', title: 'Financial Health Indicators', subtitle: 'Cash flow & collection efficiency' },
      { id: 'DA05', title: 'Customer Behavior Analytics', subtitle: 'Engagement patterns & preferences' },
      { id: 'DA06', title: 'Market Trend Analysis', subtitle: 'Pricing & demand insights' },
    ]
  },
  {
    id: 'operational_efficiency',
    name: '⚡ Operational Efficiency',
    icon: TrendingUp,
    description: 'Streamlined business processes',
    concepts: [
      { id: 'OE01', title: 'Role-Based Access Control', subtitle: 'Multi-tenant user permissions' },
      { id: 'OE02', title: 'Google Calendar Sync', subtitle: 'Site visits synced to calendar' },
      { id: 'OE03', title: 'Automated Workflow Triggers', subtitle: 'Event-based task automation' },
      { id: 'OE04', title: 'Bulk Data Import/Export', subtitle: 'CSV upload for leads & properties' },
      { id: 'OE05', title: 'Multi-Branch Management', subtitle: 'Centralized control for franchises' },
    ]
  }
];

const VIDEO_TYPES = [
  { id: 'demo_walkthrough', name: 'Demo Walkthrough', description: 'Complete feature demonstration' },
  { id: 'feature_highlight', name: 'Feature Highlight', description: 'Focus on single feature benefits' },
  { id: 'tutorial', name: 'Step-by-Step Tutorial', description: 'How-to guide for users' },
  { id: 'sales_pitch', name: 'Sales Pitch', description: 'Benefits-focused for prospects' },
  { id: 'comparison', name: 'Comparison Video', description: 'Before/After or vs competitors' },
  { id: 'testimonial_script', name: 'Testimonial Script', description: 'Customer success story format' },
];

const TARGET_AUDIENCES = [
  { id: 'real_estate_developer', name: 'Real Estate Developers', icon: '🏢' },
  { id: 'sales_manager', name: 'Sales Managers', icon: '👔' },
  { id: 'marketing_agent', name: 'Marketing Agents', icon: '📣' },
  { id: 'property_buyer', name: 'Property Buyers', icon: '🏠' },
  { id: 'investor', name: 'Investors', icon: '💰' },
  { id: 'tech_decision_maker', name: 'Tech Decision Makers', icon: '💻' },
];

const LANGUAGES = [
  { id: 'telugu', name: 'Telugu', flag: '🇮🇳' },
  { id: 'hindi', name: 'Hindi', flag: '🇮🇳' },
  { id: 'english', name: 'English', flag: '🌐' },
  { id: 'bilingual_te_en', name: 'Telugu + English Mix', flag: '🔀' },
  { id: 'bilingual_hi_en', name: 'Hindi + English Mix', flag: '🔀' },
];

const MemoraAIDemos = () => {
  // Form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedConcept, setSelectedConcept] = useState('');
  const [conceptTitle, setConceptTitle] = useState('');
  const [videoType, setVideoType] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('english');
  const [avatarStyle, setAvatarStyle] = useState('male_teacher');
  const [customNotes, setCustomNotes] = useState('');
  
  // Generated content state
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // Video generation state
  const [videoId, setVideoId] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Voiceover state
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceoverFilename, setVoiceoverFilename] = useState('');
  
  // Presentation state
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [presentationUrl, setPresentationUrl] = useState(null);
  const [presentationFilename, setPresentationFilename] = useState('');
  const [presentationTheme, setPresentationTheme] = useState('professional');
  const [uploadedScreenshots, setUploadedScreenshots] = useState([]);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  
  // Auto-generate images state
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  
  // Generated videos list
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  
  // YouTube Content Generator State
  const [ytTopic, setYtTopic] = useState('');
  const [ytCategory, setYtCategory] = useState('');
  const [ytLanguage, setYtLanguage] = useState('english');
  const [ytTone, setYtTone] = useState('professional');
  const [ytAudience, setYtAudience] = useState('property_buyers');
  const [ytEmotional, setYtEmotional] = useState(true);
  const [ytContext, setYtContext] = useState('');
  const [ytContent, setYtContent] = useState('');
  const [ytGenerating, setYtGenerating] = useState(false);
  const [ytHistory, setYtHistory] = useState([]);
  const [ytCategories, setYtCategories] = useState([]);
  
  // Config
  const [config, setConfig] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const screenshotInputRef = useRef(null);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Get concepts for selected category
  const currentConcepts = DEMO_CATEGORIES.find(c => c.id === selectedCategory)?.concepts || [];

  useEffect(() => {
    loadConfig();
    loadGeneratedVideos();
    loadYtCategories();
    loadYtHistory();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadYtCategories = async () => {
    try {
      const response = await api.get('/realapex-demos/youtube-content/categories');
      setYtCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load YT categories:', error);
    }
  };

  const loadYtHistory = async () => {
    try {
      const response = await api.get('/realapex-demos/youtube-content/history');
      setYtHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load YT history:', error);
    }
  };

  const generateYtContent = async () => {
    if (!ytTopic || !ytCategory) {
      toast.error('Please enter topic and select category');
      return;
    }
    
    setYtGenerating(true);
    setYtContent('');
    
    try {
      const response = await api.post('/realapex-demos/youtube-content/generate', {
        topic: ytTopic,
        category: ytCategory,
        language: ytLanguage,
        tone: ytTone,
        target_audience: ytAudience,
        include_emotional: ytEmotional,
        custom_context: ytContext
      });
      
      if (response.data.success) {
        setYtContent(response.data.content);
        toast.success('Content generated!');
        loadYtHistory(); // Refresh history
      } else {
        toast.error('Failed to generate content');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Generation failed');
    } finally {
      setYtGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const deleteYtContent = async (contentId) => {
    if (!window.confirm('Delete this content?')) return;
    try {
      await api.delete(`/realapex-demos/youtube-content/${contentId}`);
      toast.success('Deleted!');
      loadYtHistory();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const publishAsArticle = async (item) => {
    // Generate SEO-friendly slug from topic
    const slug = item.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 60);
    
    const finalSlug = window.prompt('Edit SEO URL slug:', slug);
    if (!finalSlug) return;
    
    try {
      await api.put(`/realapex-demos/youtube-content/${item.id}/publish?seo_slug=${encodeURIComponent(finalSlug)}`);
      toast.success(`Published! View at /articles/${finalSlug}`);
      loadYtHistory();
    } catch (error) {
      toast.error('Failed to publish');
    }
  };

  // When concept is selected, populate the title
  useEffect(() => {
    if (selectedConcept) {
      const concept = currentConcepts.find(c => c.id === selectedConcept);
      if (concept) {
        setConceptTitle(`${concept.id}: ${concept.title}`);
      }
    }
  }, [selectedConcept, currentConcepts]);

  const loadConfig = async () => {
    try {
      const response = await api.get('/tutorai/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadGeneratedVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const response = await api.get('/realapex-demos/videos');
      setGeneratedVideos(response.data.videos || []);
    } catch (error) {
      // Fallback to tutorai videos
      try {
        const fallback = await api.get('/tutorai/videos');
        setGeneratedVideos((fallback.data.videos || []).filter(v => v.subject === 'MemoraAI Demo'));
      } catch (e) {
        console.error('Failed to load videos:', e);
      }
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Generate Script for MemoraAI Demo
  const handleGenerateScript = async () => {
    if (!conceptTitle || !videoType || !targetAudience) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGeneratingScript(true);
    setScript('');
    setVideoId(null);
    setVideoUrl(null);
    setVideoStatus(null);

    const concept = currentConcepts.find(c => c.id === selectedConcept);
    const videoTypeInfo = VIDEO_TYPES.find(v => v.id === videoType);
    const audienceInfo = TARGET_AUDIENCES.find(a => a.id === targetAudience);
    const categoryInfo = DEMO_CATEGORIES.find(c => c.id === selectedCategory);

    try {
      const response = await api.post('/realapex-demos/generate-script', {
        concept_title: conceptTitle,
        concept_subtitle: concept?.subtitle || '',
        category_name: categoryInfo?.name || '',
        video_type: videoTypeInfo?.name || videoType,
        video_type_description: videoTypeInfo?.description || '',
        target_audience: audienceInfo?.name || targetAudience,
        language: language,
        custom_notes: customNotes
      });

      if (response.data.success) {
        setScript(response.data.script);
        toast.success('Script generated successfully!');
      } else {
        toast.error(response.data.error || 'Failed to generate script');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate script');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate Video
  const handleGenerateVideo = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    setVideoStatus('initiating');

    try {
      const response = await api.post('/tutorai/generate-video', {
        script: script,
        language: language,
        avatar_style: avatarStyle,
        concept_name: conceptTitle,
        class_level: 'MemoraAI Demo',
        subject: 'MemoraAI Demo'
      });

      if (response.data.success) {
        setVideoId(response.data.video_id);
        setVideoStatus('processing');
        toast.success('Video generation started!');
        startStatusPolling(response.data.video_id);
      } else {
        toast.error(response.data.error || 'Failed to start video generation');
        setIsGeneratingVideo(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate video');
      setIsGeneratingVideo(false);
    }
  };

  // Poll video status
  const startStatusPolling = (vid) => {
    let progress = 10;
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/tutorai/video-status/${vid}`);
        
        if (response.data.success) {
          const status = response.data.status;
          setVideoStatus(status);
          
          if (status === 'completed') {
            setVideoUrl(response.data.video_url);
            setVideoProgress(100);
            setIsGeneratingVideo(false);
            clearInterval(pollIntervalRef.current);
            toast.success('Video generated successfully!');
            loadGeneratedVideos();
          } else if (status === 'failed') {
            setIsGeneratingVideo(false);
            clearInterval(pollIntervalRef.current);
            toast.error(response.data.error || 'Video generation failed');
          } else {
            progress = Math.min(progress + 5, 90);
            setVideoProgress(progress);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 15000);
  };

  // Generate Voiceover (FREE - OpenAI TTS)
  const handleGenerateVoiceover = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingVoiceover(true);
    setVoiceoverUrl(null);

    try {
      const response = await api.post('/realapex-demos/generate-voiceover', {
        script: script,
        voice: selectedVoice,
        speed: voiceSpeed,
        model: 'tts-1-hd',
        concept_title: conceptTitle
      });

      if (response.data.success) {
        setVoiceoverUrl(response.data.download_url);
        setVoiceoverFilename(response.data.filename);
        toast.success('Voiceover generated! Click to download MP3');
      } else {
        toast.error(response.data.error || 'Failed to generate voiceover');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate voiceover');
    } finally {
      setIsGeneratingVoiceover(false);
    }
  };

  // Download file with authentication (fixes "Not authenticated" error)
  const handleAuthenticatedDownload = async (downloadUrl, filename, mimeType = 'application/octet-stream') => {
    try {
      toast.info('Preparing download...');
      
      // Remove /api prefix if present (api.get already adds /api)
      const cleanUrl = downloadUrl.startsWith('/api/') ? downloadUrl.substring(4) : downloadUrl;
      
      const response = await api.get(cleanUrl, { responseType: 'blob' });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download complete!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    }
  };

  // Upload Screenshots
  const handleScreenshotUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingScreenshots(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await api.post('/realapex-demos/upload-screenshots', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setUploadedScreenshots(prev => [...prev, ...response.data.files]);
        toast.success(`${response.data.uploaded_count} screenshots uploaded!`);
      }
    } catch (error) {
      toast.error('Failed to upload screenshots');
    } finally {
      setIsUploadingScreenshots(false);
    }
  };

  // Generate Presentation (100% FREE - No API costs)
  const handleGeneratePresentation = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingPresentation(true);
    setPresentationUrl(null);

    try {
      // Use uploaded screenshots only (no AI image generation)
      const imagesToUse = uploadedScreenshots.map(s => s.url);
      
      toast.info('Creating presentation...');
      const response = await api.post('/realapex-demos/generate-presentation', {
        concept_title: conceptTitle,
        script: script,
        language: language,
        theme: presentationTheme,
        include_screenshots: imagesToUse.length > 0,
        screenshot_urls: imagesToUse
      });

      if (response.data.success) {
        setPresentationUrl(response.data.download_url);
        setPresentationFilename(response.data.filename);
        toast.success(`Presentation ready! ${response.data.slides_count} slides generated`);
      } else {
        toast.error(response.data.error || 'Failed to generate presentation');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate presentation');
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  // Auto-generate Images from Prompt (FREE - OpenAI Image Generation)
  const handleAutoGenerateImages = async () => {
    if (!conceptTitle && !script) {
      toast.error('Please enter a concept title or generate a script first');
      return;
    }

    setIsGeneratingImages(true);
    setGeneratedImages([]);

    try {
      const response = await api.post('/realapex-demos/auto-generate-images', {
        concept_title: conceptTitle,
        script: script,
        category_name: DEMO_CATEGORIES.find(c => c.id === selectedCategory)?.name || '',
        num_images: 3
      });

      if (response.data.success) {
        setGeneratedImages(response.data.images);
        toast.success(`${response.data.images.length} images generated!`);
      } else {
        toast.error(response.data.error || 'Failed to generate images');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate images');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">MemoraAI Demo Generator</h1>
              <p className="text-purple-200">AI-Powered YouTube Demo Videos for Real Estate SaaS</p>
            </div>
          </div>
          
          {/* Config Status */}
          <div className="flex gap-2 mt-4">
            <Badge variant={config?.llm_configured ? "default" : "destructive"} className="bg-green-600">
              {config?.llm_configured ? '✓' : '✗'} Claude AI
            </Badge>
            <Badge variant={config?.heygen_configured ? "default" : "destructive"} className="bg-blue-600">
              {config?.heygen_configured ? '✓' : '✗'} HeyGen Video
            </Badge>
            <Badge className="bg-orange-600">2026 PropTech Edition</Badge>
          </div>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-slate-800/50">
            <TabsTrigger value="generate" className="data-[state=active]:bg-purple-600">Generate</TabsTrigger>
            <TabsTrigger value="youtube" className="data-[state=active]:bg-red-600">YouTube Content</TabsTrigger>
            <TabsTrigger value="concepts" className="data-[state=active]:bg-purple-600">All Concepts</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">History</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Video className="w-5 h-5 text-orange-400" />
                    Demo Video Details
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Select concept and configure video parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label className="text-slate-200">Category *</Label>
                    <Select value={selectedCategory} onValueChange={(val) => {
                      setSelectedCategory(val);
                      setSelectedConcept('');
                      setConceptTitle('');
                    }}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="category-select">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {DEMO_CATEGORIES.map(cat => (
                          <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-slate-700">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Concept Selection */}
                  {selectedCategory && (
                    <div className="space-y-2">
                      <Label className="text-slate-200">Concept *</Label>
                      <Select value={selectedConcept} onValueChange={setSelectedConcept}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="concept-select">
                          <SelectValue placeholder="Select concept" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
                          {currentConcepts.map(concept => (
                            <SelectItem key={concept.id} value={concept.id} className="text-white hover:bg-slate-700">
                              <span className="font-mono text-orange-400 mr-2">{concept.id}</span>
                              {concept.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Concept Title (Editable) */}
                  <div className="space-y-2">
                    <Label className="text-slate-200">Concept Title *</Label>
                    <Input
                      placeholder="Auto-filled from selection or enter custom"
                      value={conceptTitle}
                      onChange={(e) => setConceptTitle(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      data-testid="concept-title-input"
                    />
                    {selectedConcept && currentConcepts.find(c => c.id === selectedConcept) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {currentConcepts.find(c => c.id === selectedConcept)?.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Video Type & Target Audience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Video Type *</Label>
                      <Select value={videoType} onValueChange={setVideoType}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="video-type-select">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {VIDEO_TYPES.map(type => (
                            <SelectItem key={type.id} value={type.id} className="text-white hover:bg-slate-700">
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Target Audience *</Label>
                      <Select value={targetAudience} onValueChange={setTargetAudience}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="audience-select">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {TARGET_AUDIENCES.map(aud => (
                            <SelectItem key={aud.id} value={aud.id} className="text-white hover:bg-slate-700">
                              {aud.icon} {aud.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Language & Avatar */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.id} value={lang.id} className="text-white hover:bg-slate-700">
                              {lang.flag} {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Avatar Style</Label>
                      <Select value={avatarStyle} onValueChange={setAvatarStyle}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="avatar-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="male_teacher" className="text-white hover:bg-slate-700">👨‍💼 Male Presenter</SelectItem>
                          <SelectItem value="female_teacher" className="text-white hover:bg-slate-700">👩‍💼 Female Presenter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom Notes */}
                  <div className="space-y-2">
                    <Label className="text-slate-200">Custom Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add any specific points, USPs, or instructions for the script..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                      data-testid="custom-notes"
                    />
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold"
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript || !conceptTitle || !videoType || !targetAudience}
                    data-testid="generate-script-btn"
                  >
                    {isGeneratingScript ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Script...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" />Generate Script</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Script Output */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5 text-green-400" />
                    Generated Script
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Script will appear here after generation..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="min-h-[350px] font-mono text-sm bg-slate-900 border-slate-600 text-slate-100"
                    data-testid="script-textarea"
                  />

                  {script && (
                    <div className="space-y-3">
                      {/* Voiceover Generation - 100% FREE */}
                      <div className="p-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg border border-emerald-700">
                        <div className="flex items-center gap-2 text-emerald-400 mb-3">
                          <Mic className="w-5 h-5" />
                          <span className="font-semibold">Generate Voiceover</span>
                          <Badge className="bg-emerald-600 text-xs">100% FREE - Unlimited</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="space-y-1">
                            <Label className="text-slate-300 text-xs">Voice Style</Label>
                            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="nova" className="text-white">Jenny (Female, Friendly)</SelectItem>
                                <SelectItem value="alloy" className="text-white">Guy (Male, Neutral)</SelectItem>
                                <SelectItem value="indian_female" className="text-white">Neerja (Indian Female)</SelectItem>
                                <SelectItem value="indian_male" className="text-white">Prabhat (Indian Male)</SelectItem>
                                <SelectItem value="telugu_female" className="text-white">Shruti (Telugu Female)</SelectItem>
                                <SelectItem value="telugu_male" className="text-white">Mohan (Telugu Male)</SelectItem>
                                <SelectItem value="hindi_female" className="text-white">Swara (Hindi Female)</SelectItem>
                                <SelectItem value="hindi_male" className="text-white">Madhur (Hindi Male)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-slate-300 text-xs">Speed: {voiceSpeed}x</Label>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="1.5" 
                              step="0.1"
                              value={voiceSpeed}
                              onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleGenerateVoiceover}
                          disabled={isGeneratingVoiceover}
                          data-testid="generate-voiceover-btn"
                        >
                          {isGeneratingVoiceover ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Voiceover...</>
                          ) : (
                            <><Volume2 className="w-4 h-4 mr-2" />Generate Voiceover MP3</>
                          )}
                        </Button>
                        
                        {voiceoverUrl && (
                          <div className="mt-3 p-3 bg-emerald-900/50 rounded-lg">
                            <div className="flex items-center gap-2 text-emerald-300 mb-2">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Voiceover Ready!</span>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full bg-emerald-700 hover:bg-emerald-800"
                              onClick={() => handleAuthenticatedDownload(voiceoverUrl, voiceoverFilename, 'audio/mpeg')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download MP3 (Upload to HeyGen)
                            </Button>
                            <p className="text-xs text-emerald-400 mt-2 text-center">
                              HeyGen → Create Video → Upload Audio → Avatar will lip-sync!
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Presentation Generation - FREE */}
                      <div className="p-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-lg border border-blue-700">
                        <div className="flex items-center gap-2 text-blue-400 mb-3">
                          <Presentation className="w-5 h-5" />
                          <span className="font-semibold">Generate PowerPoint (FREE)</span>
                          <Badge className="bg-blue-600 text-xs">python-pptx</Badge>
                        </div>
                        
                        {/* Images Section - Optional pre-generation or upload */}
                        <div className="mb-3">
                          <Label className="text-slate-300 text-xs mb-2 block">
                            Slide Images <span className="text-slate-500">(Optional - Auto-generated if empty)</span>
                          </Label>
                          
                          {/* Info about auto-generation */}
                          {generatedImages.length === 0 && uploadedScreenshots.length === 0 && (
                            <p className="text-xs text-slate-400 mb-2 p-2 bg-slate-800/50 rounded">
                              💡 No images? PPT will auto-generate AI images when you click "Generate PowerPoint"
                            </p>
                          )}
                          
                          {/* Manual Pre-Generate Button */}
                          {/* Upload Screenshots */}
                          <div className="flex gap-2">
                            <input
                              type="file"
                              ref={screenshotInputRef}
                              onChange={handleScreenshotUpload}
                              multiple
                              accept="image/*"
                              className="hidden"
                            />
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => screenshotInputRef.current?.click()}
                              disabled={isUploadingScreenshots}
                            >
                              {isUploadingScreenshots ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                              ) : (
                                <><Upload className="w-4 h-4 mr-2" />Upload Your Screenshots</>
                              )}
                            </Button>
                            {uploadedScreenshots.length > 0 && (
                              <Badge className="bg-green-600">{uploadedScreenshots.length} uploaded</Badge>
                            )}
                          </div>
                          
                          {/* Uploaded Screenshots Preview */}
                          {uploadedScreenshots.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {uploadedScreenshots.map((ss, idx) => (
                                <div key={idx} className="relative group">
                                  <img 
                                    src={`${API_URL}${ss.url}`} 
                                    alt={ss.original_name}
                                    className="w-16 h-10 object-cover rounded border border-blue-600"
                                  />
                                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {uploadedScreenshots.length === 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                              💡 Upload your app screenshots - they will be added as slides in PPT
                            </p>
                          )}
                        </div>
                        
                        {/* Theme Selection */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="space-y-1">
                            <Label className="text-slate-300 text-xs">Theme</Label>
                            <Select value={presentationTheme} onValueChange={setPresentationTheme}>
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="professional" className="text-white">Professional (Dark)</SelectItem>
                                <SelectItem value="modern" className="text-white">Modern (Purple)</SelectItem>
                                <SelectItem value="minimal" className="text-white">Minimal (Light)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <p className="text-xs text-slate-400">
                              6-8 slides with speaker notes
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={handleGeneratePresentation}
                          disabled={isGeneratingPresentation}
                          data-testid="generate-presentation-btn"
                        >
                          {isGeneratingPresentation ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Presentation...</>
                          ) : (
                            <><Presentation className="w-4 h-4 mr-2" />Generate PowerPoint</>
                          )}
                        </Button>
                        
                        {presentationUrl && (
                          <div className="mt-3 p-3 bg-blue-900/50 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-300 mb-2">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Presentation Ready!</span>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full bg-blue-700 hover:bg-blue-800"
                              onClick={() => handleAuthenticatedDownload(presentationUrl, presentationFilename, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download .PPTX
                            </Button>
                            <p className="text-xs text-blue-400 mt-2 text-center">
                              Open in PowerPoint → Add your screenshots → Export as video!
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-700 pt-3">
                        <p className="text-xs text-slate-500 text-center mb-2">OR generate full avatar video (requires HeyGen credits)</p>
                      </div>

                      {/* Video Generation */}
                      {!videoUrl && (
                        <Button 
                          className="w-full bg-gradient-to-r from-red-500 to-purple-500 hover:from-red-600 hover:to-purple-600"
                          onClick={handleGenerateVideo}
                          disabled={isGeneratingVideo || !config?.heygen_configured}
                          data-testid="generate-video-btn"
                        >
                          {isGeneratingVideo ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Video...</>
                          ) : (
                            <><Video className="w-4 h-4 mr-2" />Generate Video (HeyGen)</>
                          )}
                        </Button>
                      )}

                      {/* Progress Bar */}
                      {isGeneratingVideo && (
                        <div className="space-y-2 p-4 bg-slate-900 rounded-lg">
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Video Generation Progress</span>
                            <span>{videoProgress}%</span>
                          </div>
                          <Progress value={videoProgress} className="h-2" />
                          <p className="text-xs text-slate-400 text-center">
                            {videoStatus === 'processing' ? 'Processing... This may take 5-10 minutes' : videoStatus}
                          </p>
                        </div>
                      )}

                      {/* Video Download */}
                      {videoUrl && (
                        <div className="p-4 bg-green-900/30 rounded-lg border border-green-700">
                          <div className="flex items-center gap-2 text-green-400 mb-3">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Video Ready!</span>
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => window.open(videoUrl, '_blank')}
                            data-testid="download-video-btn"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Video
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Concepts Tab */}
          <TabsContent value="concepts">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {DEMO_CATEGORIES.map(category => {
                const IconComponent = category.icon;
                return (
                  <Card key={category.id} className="bg-slate-800/50 border-slate-700 hover:border-purple-500 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white">{category.name}</CardTitle>
                          <CardDescription className="text-slate-400 text-xs">{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.concepts.map(concept => (
                          <li 
                            key={concept.id} 
                            className="flex items-start gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setSelectedConcept(concept.id);
                              setConceptTitle(`${concept.id}: ${concept.title}`);
                              document.querySelector('[value="generate"]')?.click();
                            }}
                          >
                            <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs font-mono shrink-0">
                              {concept.id}
                            </Badge>
                            <div>
                              <p className="text-sm text-white font-medium">{concept.title}</p>
                              <p className="text-xs text-slate-400">{concept.subtitle}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Video className="w-5 h-5 text-purple-400" />
                      Generated Demo Videos
                    </CardTitle>
                    <CardDescription className="text-slate-400">All MemoraAI demo videos</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadGeneratedVideos} className="border-slate-600 text-slate-300">
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingVideos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : generatedVideos.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No demo videos generated yet</p>
                    <p className="text-sm mt-1">Start by selecting a concept and generating a script</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedVideos.map((video) => (
                      <div key={video.id} className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-purple-500 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-white">{video.concept_name}</h4>
                            <p className="text-sm text-slate-400">
                              {video.language} • {new Date(video.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(video.status)}
                        </div>
                        
                        {video.status === 'completed' && video.download_url && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => window.open(video.download_url, '_blank')} className="bg-purple-600 hover:bg-purple-700">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(video.download_url, '_blank')} className="border-slate-600 text-slate-300">
                              <Play className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* YouTube Content Generator Tab */}
          <TabsContent value="youtube">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generator Form */}
              <Card className="bg-slate-900/80 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube Content Generator
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Generate copy-paste ready content for your YouTube videos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Topic */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Video Topic *</label>
                    <input
                      type="text"
                      value={ytTopic}
                      onChange={(e) => setYtTopic(e.target.value)}
                      placeholder="e.g., 5 Things to Check Before Buying Land in Hyderabad"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Category *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ytCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setYtCategory(cat.id)}
                          className={`p-3 rounded-lg text-left transition-all ${
                            ytCategory === cat.id
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          <p className="text-sm font-medium mt-1">{cat.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone & Language */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block">Tone</label>
                      <select
                        value={ytTone}
                        onChange={(e) => setYtTone(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="motivational">Motivational</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-2 block">Language</label>
                      <select
                        value={ytLanguage}
                        onChange={(e) => setYtLanguage(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="telugu">Telugu</option>
                        <option value="hinglish">Hinglish</option>
                      </select>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Target Audience</label>
                    <select
                      value={ytAudience}
                      onChange={(e) => setYtAudience(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="property_buyers">Property Buyers</option>
                      <option value="investors">Real Estate Investors</option>
                      <option value="first_time_buyers">First Time Home Buyers</option>
                      <option value="nri_buyers">NRI Buyers</option>
                      <option value="agents">Real Estate Agents</option>
                    </select>
                  </div>

                  {/* Emotional Intelligence Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Emotional Intelligence</p>
                      <p className="text-xs text-slate-400">Add storytelling & emotional hooks</p>
                    </div>
                    <button
                      onClick={() => setYtEmotional(!ytEmotional)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        ytEmotional ? 'bg-red-500' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        ytEmotional ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Custom Context */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Additional Context (Optional)</label>
                    <textarea
                      value={ytContext}
                      onChange={(e) => setYtContext(e.target.value)}
                      placeholder="Any specific points to cover, local references, etc."
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none"
                    />
                  </div>

                  <Button
                    onClick={generateYtContent}
                    disabled={ytGenerating || !ytTopic || !ytCategory}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg"
                  >
                    {ytGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate YouTube Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Content / History */}
              <Card className="bg-slate-900/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    {ytContent ? 'Generated Content' : 'Content History'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ytContent ? (
                    <div className="space-y-4">
                      <div className="bg-slate-800 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-slate-300 text-sm font-sans">
                          {ytContent}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => copyToClipboard(ytContent)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy All
                        </Button>
                        <Button
                          onClick={() => setYtContent('')}
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : ytHistory.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {ytHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-white">{item.topic}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {ytCategories.find(c => c.id === item.category)?.name || item.category} • {item.language}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setYtContent(item.content);
                                  setYtTopic(item.topic);
                                }}
                                className="p-2 text-blue-400 hover:bg-slate-600 rounded"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(item.content)}
                                className="p-2 text-green-400 hover:bg-slate-600 rounded"
                                title="Copy"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {!item.published && (
                                <button
                                  onClick={() => publishAsArticle(item)}
                                  className="p-2 text-purple-400 hover:bg-slate-600 rounded"
                                  title="Publish as SEO Article"
                                >
                                  <Globe className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteYtContent(item.id)}
                                className="p-2 text-red-400 hover:bg-slate-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {item.published && item.seo_slug && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                Published
                              </span>
                              <a 
                                href={`/articles/${item.seo_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:underline"
                              >
                                /articles/{item.seo_slug}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <p className="text-lg">No content generated yet</p>
                      <p className="text-sm mt-1">Generate your first YouTube content</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MemoraAIDemos;
