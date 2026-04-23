import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Volume2, VolumeX, Search, Home, MapPin, Users, CreditCard, TrendingUp, Mail, Building, HardHat } from 'lucide-react';

const AvatarAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [language, setLanguage] = useState('english'); // english, telugu, hindi
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');

  // Detect current page
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/advisory')) setCurrentPage('advisory');
    else if (path.includes('/workforce-map')) setCurrentPage('workforce');
    else if (path.includes('/solutions/crm')) setCurrentPage('crm');
    else if (path.includes('/solutions/property')) setCurrentPage('property');
    else if (path.includes('/dashboard')) setCurrentPage('dashboard');
    else if (path.includes('/leads')) setCurrentPage('leads');
    else if (path.includes('/login')) setCurrentPage('login');
    else if (path.includes('/contact')) setCurrentPage('contact');
    else setCurrentPage('home');
  }, []);

  // Feature explanations in multiple languages
  const features = {
    welcome: {
      english: "Hello! I'm your MemoraAI Speaking Guide! We help real estate companies grow 40X faster with multi-project management, visual property layouts, payment automation, expert advisory, and workforce solutions. Search for any feature or ask me anything!",
      telugu: "నమస్కారం! నేను మీ రెటో ఇఆర్‌పీ సాఫ్ట్‌వేర్ స్పీకింగ్ గైడ్! మేము రియల్ ఎస్టేట్ కంపెనీలకు మల్టీ-ప్రాజెక్ట్ మేనేజ్‌మెంట్, విజువల్ ప్రాపర్టీ లేఅవుట్స్, పేమెంట్ ఆటోమేషన్, ఎక్స్‌పర్ట్ అడ్వైజరీతో 40X వేగంగా పెరగడానికి సహాయం చేస్తాము!",
      hindi: "नमस्ते! मैं आपकी रेटो ईआरपी सॉफ्टवेयर स्पीकिंग गाइड हूँ! हम रियल एस्टेट कंपनियों को मल्टी-प्रोजेक्ट मैनेजमेंट, विज़ुअल प्रॉपर्टी लेआउट, पेमेंट ऑटोमेशन के साथ 40X तेजी से बढ़ने में मदद करते हैं!"
    },
    // Page-specific help messages
    currentPage: {
      advisory: {
        english: "You're on the Expert Advisory page. Here you can get FREE 24x7 guidance on budget, location, numerology, and investment. Select a category and fill the form to get personalized advice in your preferred language!",
        telugu: "మీరు ఎక్స్‌పర్ట్ అడ్వైజరీ పేజీలో ఉన్నారు. ఇక్కడ మీరు బడ్జెట్, స్థానం, న్యూమరాలజీ మరియు ఇన్వెస్ట్‌మెంట్‌పై ఉచిత 24x7 మార్గదర్శకత్వం పొందవచ్చు. కేటగిరీని ఎంచుకుని, మీ ఇష్టమైన భాషలో వ్యక్తిగత సలహా పొందడానికి ఫారం పూరించండి!",
        hindi: "आप एक्सपर्ट एडवाइजरी पेज पर हैं। यहाँ आप बजट, स्थान, न्यूमरोलॉजी और निवेश पर मुफ्त 24x7 मार्गदर्शन प्राप्त कर सकते हैं।"
      },
      workforce: {
        english: "You're on the Workforce Map. Here you can find skilled construction workers near you - carpenters, electricians, masons, and more. Use the search bar to filter by location and skill type. Click on any worker card to see their contact details and call or WhatsApp them directly!",
        telugu: "మీరు వర్క్‌ఫోర్స్ మ్యాప్‌లో ఉన్నారు. ఇక్కడ మీరు మీ దగ్గర ఉన్న నైపుణ్యం కలిగిన నిర్మాణ కార్మికులను కనుగొనవచ్చు - వడ్రంగులు, ఎలక్ట్రీషియన్లు, మేస్త్రీలు మరియు మరిన్ని. స్థానం మరియు నైపుణ్య రకాన్ని బట్టి ఫిల్టర్ చేయడానికి సెర్చ్ బార్‌ను ఉపయోగించండి!",
        hindi: "आप वर्कफोर्स मैप पर हैं। यहाँ आप अपने पास कुशल निर्माण श्रमिकों को ढूंढ सकते हैं - बढ़ई, इलेक्ट्रीशियन, मिस्त्री।"
      },
      crm: {
        english: "You're viewing the Smart CRM solution. This feature tracks every lead automatically with 0% lead leakage. You can manage customers, send automated follow-ups, and never miss an opportunity. Want to see a demo or learn more?",
        telugu: "మీరు స్మార్ట్ CRM సొల్యూషన్‌ను చూస్తున్నారు. ఈ ఫీచర్ ప్రతి లీడ్‌ను స్వయంచాలకంగా 0% లీడ్ లీకేజ్‌తో ట్రాక్ చేస్తుంది. మీరు కస్టమర్‌లను నిర్వహించవచ్చు, స్వయంచాలిత ఫాలో-అప్‌లు పంపవచ్చు!",
        hindi: "आप स्मार्ट सीआरएम समाधान देख रहे हैं। यह सुविधा स्वचालित रूप से हर लीड को ट्रैक करती है।"
      },
      property: {
        english: "You're on the Visual Property Layouts page. This feature lets customers see interactive maps with real-time availability. They can click on plots and book directly - resulting in 3X higher conversions! Click the demo button to see it in action.",
        telugu: "మీరు విజువల్ ప్రాపర్టీ లేఅవుట్స్ పేజీలో ఉన్నారు. ఈ ఫీచర్ కస్టమర్‌లకు రియల్-టైమ్ లభ్యతతో ఇంటరాక్టివ్ మ్యాప్‌లను చూడటానికి అనుమతిస్తుంది!",
        hindi: "आप विज़ुअल प्रॉपर्टी लेआउट पेज पर हैं। यह सुविधा ग्राहकों को इंटरैक्टिव मैप देखने देती है।"
      },
      dashboard: {
        english: "You're on your Dashboard. Here you can see your business overview - leads, bookings, revenue, and team performance all in one place. Use the navigation menu to access different sections like Leads, Properties, and Analytics.",
        telugu: "మీరు మీ డాష్‌బోర్డ్‌లో ఉన్నారు. ఇక్కడ మీరు మీ వ్యాపార అవలోకనాన్ని చూడవచ్చు - లీడ్స్, బుకింగ్‌లు, ఆదాయం మరియు టీమ్ పనితీరు అన్నీ ఒకే చోట!",
        hindi: "आप अपने डैशबोर्ड पर हैं। यहाँ आप अपने व्यवसाय का अवलोकन देख सकते हैं।"
      },
      leads: {
        english: "You're on the Leads Management page. Here you can view all your leads, filter them by status, assign them to agents, and track follow-ups. Click on any lead to see detailed information and update their status.",
        telugu: "మీరు లీడ్స్ మేనేజ్‌మెంట్ పేజీలో ఉన్నారు. ఇక్కడ మీరు మీ అన్ని లీడ్‌లను చూడవచ్చు, స్టేటస్ ద్వారా వాటిని ఫిల్టర్ చేయవచ్చు, ఏజెంట్లకు కేటాయించవచ్చు!",
        hindi: "आप लीड्स प्रबंधन पेज पर हैं। यहाँ आप अपने सभी लीड्स देख सकते हैं।"
      },
      login: {
        english: "You're on the Login page. Enter your mobile number to receive an OTP and access your MemoraAI dashboard. New user? Contact us to create your account and start managing your real estate business efficiently!",
        telugu: "మీరు లాగిన్ పేజీలో ఉన్నారు. OTP పొందడానికి మీ మొబైల్ నంబర్‌ను నమోదు చేయండి మరియు మీ రెటో ఇఆర్‌పీ డాష్‌బోర్డ్‌ను యాక్సెస్ చేయండి!",
        hindi: "आप लॉगिन पेज पर हैं। अपने मोबाइल नंबर दर्ज करें।"
      },
      home: {
        english: "You're on the MemoraAI homepage! We help real estate companies grow 40X faster. Scroll down to see our latest additions: Video Demo section (coming soon), Simple Pricing with 3 plans starting at ₹9,999/month, First 3 Months Free Support offer, Multi-Project Management capabilities, Feature Request system, and real client testimonials from Abhinandhana Avenues, BRR Group, and Sri Jayam Housing. Explore all features using the menu!",
        telugu: "మీరు రెటో ఇఆర్‌పీ హోమ్‌పేజీలో ఉన్నారు! మేము రియల్ ఎస్టేట్ కంపెనీలకు 40X వేగంగా పెరగడానికి సహాయం చేస్తాము. క్రిందికి స్క్రోల్ చేసి మా తాజా జోడింపులను చూడండి: వీడియో డెమో, సాధారణ ధరలు ₹9,999/నెల నుండి, మొదటి 3 నెలలు ఉచిత మద్దతు!",
        hindi: "आप रेटो ईआरपी होमपेज पर हैं! हम रियल एस्टेट कंपनियों को 40X तेजी से बढ़ने में मदद करते हैं। नीचे स्क्रॉल करके हमारे नवीनतम जोड़ देखें: वीडियो डेमो, सरल मूल्य निर्धारण ₹9,999/माह से, पहले 3 महीने मुफ्त सहायता!"
      }
    },
    login: {
      english: "Login page lets you access your MemoraAI dashboard. Use your mobile number to receive OTP and login securely.",
      telugu: "లాగిన్ పేజీ మీ రెటో ఇఆర్‌పీ డాష్‌బోర్డ్‌ను యాక్సెస్ చేయడానికి అనుమతిస్తుంది. OTP పొందడానికి మీ మొబైల్ నంబర్‌ను ఉపయోగించండి!",
      hindi: "लॉगिन पेज आपको रेटो ईआरपी डैशबोर्ड तक पहुंचने देता है।",
      link: "/login"
    },
    crm: {
      english: "Smart CRM tracks every lead automatically with 0% lead leakage. Automated follow-ups ensure no opportunity is missed.",
      telugu: "స్మార్ట్ CRM ప్రతి లీడ్‌ను స్వయంచాలకంగా ట్రాక్ చేస్తుంది, 0% లీడ్ లీకేజ్‌తో!",
      hindi: "स्मार्ट सीआरएम हर लीड को स्वचालित रूप से ट्रैक करता है।",
      link: "/solutions/crm"
    },
    property: {
      english: "Visual Property Layouts show interactive maps with real-time availability. Customers can see plots and book directly - 3X higher conversions!",
      telugu: "విజువల్ ప్రాపర్టీ లేఅవుట్స్ రియల్-టైమ్ లభ్యతతో ఇంటరాక్టివ్ మ్యాప్‌లను చూపిస్తాయి!",
      hindi: "विज़ुअल प्रॉपर्टी लेआउट रियल-टाइम उपलब्धता दिखाते हैं।",
      link: "/solutions/property-layouts"
    },
    advisory: {
      english: "FREE 24x7 Expert Advisory provides guidance on budget, location, numerology and investment - in multiple languages!",
      telugu: "ఉచిత 24x7 ఎక్స్‌పర్ట్ అడ్వైజరీ బడ్జెట్, స్థానం, న్యూమరాలజీపై మార్గదర్శకత్వం అందిస్తుంది!",
      hindi: "मुफ्त 24x7 विशेषज्ञ सलाह बजट और निवेश पर मार्गदर्शन प्रदान करती है।",
      link: "/advisory"
    },
    workforce: {
      english: "Workforce Map helps find skilled construction workers - carpenters, electricians, masons nearby with direct contact.",
      telugu: "వర్క్‌ఫోర్స్ మ్యాప్ నైపుణ్యం కలిగిన నిర్మాణ కార్మికులను కనుగొనడంలో సహాయపడుతుంది!",
      hindi: "वर्कफोर्स मैप कुशल निर्माण श्रमिकों को खोजने में मदद करता है।",
      link: "/workforce-map"
    },
    dashboard: {
      english: "Dashboard shows your business overview - leads, bookings, revenue, and team performance in one place.",
      telugu: "డాష్‌బోర్డ్ మీ వ్యాపార అవలోకనాన్ని చూపిస్తుంది - లీడ్స్, బుకింగ్‌లు, ఆదాయం!",
      hindi: "डैशबोर्ड आपके व्यवसाय का अवलोकन दिखाता है।",
      link: "/dashboard"
    },
    contact: {
      english: "Contact us anytime! Phone: +91 9948303060, Email: admin at memoraai.in. We're here to help!",
      telugu: "ఎప్పుడైనా మమ్మల్ని సంప్రదించండి! ఫోన్: +91 9948303060!",
      hindi: "किसी भी समय संपर्क करें! फोन: +91 9948303060।",
      link: "/contact"
    },
    pricing: {
      english: "Simple transparent pricing with 3 plans: Starter at ₹9,999/month, Professional at ₹24,999/month (Most Popular), and Enterprise at ₹49,999/month. All plans include CRM, property layouts, and automated payments. Get first 3 months free support!",
      telugu: "3 ప్లాన్‌లతో సరళమైన ధరలు: స్టార్టర్ ₹9,999/నెల, ప్రొఫెషనల్ ₹24,999/నెల, ఎంటర్‌ప్రైజ్ ₹49,999/నెల. మొదటి 3 నెలలు ఉచిత మద్దతు!",
      hindi: "सरल मूल्य निर्धारण 3 योजनाओं के साथ: स्टार्टर ₹9,999/माह, प्रोफेशनल ₹24,999/माह, एंटरप्राइज़ ₹49,999/माह। पहले 3 महीने मुफ्त सहायता!",
      link: "/pricing"
    },
    multiproject: {
      english: "Multi-Project Management lets you manage multiple real estate projects simultaneously in one dashboard. Switch between projects without losing context. Track leads, bookings, and revenue across all projects with unified analytics and cross-project reports!",
      telugu: "మల్టీ-ప్రాజెక్ట్ మేనేజ్‌మెంట్ ఒకే డాష్‌బోర్డ్‌లో ఏకకాలంలో అనేక ప్రాజెక్ట్‌లను నిర్వహించడానికి మిమ్మల్ని అనుమతిస్తుంది. కాంటెక్స్ట్ కోల్పోకుండా ప్రాజెక్ట్‌ల మధ్య మారండి!",
      hindi: "मल्टी-प्रोजेक्ट मैनेजमेंट आपको एक डैशबोर्ड में कई परियोजनाओं का प्रबंधन करने देता है। संदर्भ खोए बिना परियोजनाओं के बीच स्विच करें!",
      link: "/solutions/multi-project-management"
    },
    support: {
      english: "We provide comprehensive support with first 3 months FREE support (conditions apply)! Includes onboarding assistance, team training, priority bug fixes, and technical consultation. Multi-channel support via Phone, WhatsApp, Email in English, Telugu, and Hindi. Submit feature requests anytime - high-demand features added to latest versions free!",
      telugu: "మేము మొదటి 3 నెలలు ఉచిత మద్దతుతో సమగ్ర మద్దతును అందిస్తాము! ఫోన్, వాట్సాప్, ఇమెయిల్ ద్వారా ఇంగ్లీష్, తెలుగు, హిందీలో మల్టీ-ఛానల్ మద్దతు!",
      hindi: "हम पहले 3 महीने मुफ्त सहायता के साथ व्यापक समर्थन प्रदान करते हैं! फोन, व्हाट्सएप, ईमेल के माध्यम से अंग्रेजी, तेलुगु, हिंदी में मल्टी-चैनल समर्थन!",
      link: "/contact"
    },
    demo: {
      english: "Want to see MemoraAI in action? We have a product demo video coming soon! Meanwhile, you can schedule a live demo with our team to explore all features - multi-project dashboard, visual property layouts, payment automation, and WhatsApp integration!",
      telugu: "రెటో ఇఆర్‌పీని చర్యలో చూడాలనుకుంటున్నారా? మా ఉత్పత్తి డెమో వీడియో త్వరలో వస్తోంది! అయితే, మా టీమ్‌తో లైవ్ డెమో షెడ్యూల్ చేయండి!",
      hindi: "रेटो ईआरपी को कार्रवाई में देखना चाहते हैं? हमारा उत्पाद डेमो वीडियो जल्द आ रहा है! इस बीच, हमारी टीम के साथ लाइव डेमो शेड्यूल करें!",
      link: "/contact"
    },
    payments: {
      english: "Payment Automation tracks all customer payments, sends automated reminders via SMS and WhatsApp, generates instant receipts, and handles commission calculations transparently. Achieve 90% on-time payment collection with automated payment schedules!",
      telugu: "పేమెంట్ ఆటోమేషన్ అన్ని కస్టమర్ చెల్లింపులను ట్రాక్ చేస్తుంది, SMS మరియు వాట్సాప్ ద్వారా స్వయంచాలిత రిమైండర్‌లను పంపుతుంది!",
      hindi: "पेमेंट ऑटोमेशन सभी ग्राहक भुगतानों को ट्रैक करता है, एसएमएस और व्हाट्सएप के माध्यम से स्वचालित अनुस्मारक भेजता है!",
      link: "/solutions/payments"
    }
  };

  // Search index for smart search
  const searchIndex = [
    { keywords: ['login', 'signin', 'enter', 'access'], feature: 'login', icon: <Home className="w-4 h-4" /> },
    { keywords: ['crm', 'leads', 'customers', 'follow'], feature: 'crm', icon: <Users className="w-4 h-4" /> },
    { keywords: ['property', 'layout', 'map', 'plots', 'visual'], feature: 'property', icon: <MapPin className="w-4 h-4" /> },
    { keywords: ['advisory', 'expert', 'guidance', 'advice', 'consult'], feature: 'advisory', icon: <MessageCircle className="w-4 h-4" /> },
    { keywords: ['workforce', 'workers', 'labour', 'carpenter', 'mason'], feature: 'workforce', icon: <HardHat className="w-4 h-4" /> },
    { keywords: ['dashboard', 'overview', 'stats', 'analytics'], feature: 'dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { keywords: ['contact', 'phone', 'email', 'support', 'help'], feature: 'contact', icon: <Mail className="w-4 h-4" /> },
    { keywords: ['pricing', 'price', 'cost', 'plans', 'package', 'subscription'], feature: 'pricing', icon: <CreditCard className="w-4 h-4" /> },
    { keywords: ['multi', 'multiple', 'projects', 'multiproject', 'manage'], feature: 'multiproject', icon: <Building className="w-4 h-4" /> },
    { keywords: ['support', 'help', 'training', 'onboarding', 'assistance'], feature: 'support', icon: <MessageCircle className="w-4 h-4" /> },
    { keywords: ['demo', 'video', 'tutorial', 'show', 'watch'], feature: 'demo', icon: <MessageCircle className="w-4 h-4" /> },
    { keywords: ['payment', 'pay', 'installment', 'receipt', 'automation'], feature: 'payments', icon: <CreditCard className="w-4 h-4" /> }
  ];

  // Smart search function
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = searchIndex.filter(item =>
      item.keywords.some(keyword => keyword.includes(query.toLowerCase()))
    );
    setSearchResults(results);
  };

  // Speak text using Web Speech API with natural human-like delivery
  const speak = (text) => {
    if (!speechEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    // Add natural pauses for better human-like speech
    const naturalText = text
      .replace(/\./g, '...') // Longer pause after sentences
      .replace(/,/g, '..') // Short pause after commas
      .replace(/\?/g, '...?') // Pause before question mark
      .replace(/!/g, '...!'); // Pause before exclamation
    
    const utterance = new SpeechSynthesisUtterance(naturalText);
    
    // More human-like settings
    utterance.rate = 0.8; // Even slower for natural conversational pace
    utterance.pitch = 1.15; // Moderate sweetness, not too high
    utterance.volume = 0.85; // Softer, more intimate volume

    const voices = window.speechSynthesis.getVoices();
    
    // Select voice based on language
    let selectedVoice = null;
    
    if (language === 'telugu') {
      // For Telugu, try Telugu voices first, then Indian English
      selectedVoice = voices.find(voice => 
        voice.lang.includes('te-IN') || // Telugu
        voice.lang.includes('te') ||
        voice.name.includes('Telugu')
      );
      
      // If no Telugu voice, use Indian English (sounds better for Telugu transliteration)
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          (voice.lang.includes('en-IN') && voice.name.toLowerCase().includes('female')) ||
          (voice.lang.includes('hi-IN') && voice.name.toLowerCase().includes('female'))
        );
      }
    } else if (language === 'hindi') {
      // For Hindi, try Hindi voices
      selectedVoice = voices.find(voice => 
        voice.lang.includes('hi-IN') ||
        voice.name.includes('हिन्दी') ||
        voice.name.includes('Hindi') ||
        voice.name.includes('Heera') ||
        voice.name.includes('Kalpana')
      );
    } else {
      // For English, try Indian English female voices
      selectedVoice = voices.find(voice => 
        (voice.lang.includes('en-IN') && voice.name.toLowerCase().includes('female'))
      );
    }
    
    // Fallback to best quality voices
    if (!selectedVoice) {
      selectedVoice = voices.find(voice =>
        voice.name.includes('Samantha') || // iOS - Most natural!
        voice.name.includes('Google हिन्दी') ||
        voice.name.includes('Rishi') || // Indian male but natural
        voice.name.includes('Veena') || // Indian female
        voice.name.includes('Google UK English Female') ||
        voice.name.includes('Serena')
      );
    }
    
    // Last resort - any female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman')
      );
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`🎤 Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    }

    // Add natural speech events for more human feel
    let wordIndex = 0;
    const words = text.split(' ');
    
    utterance.onboundary = (event) => {
      // Add slight pitch variation for each word (more expressive)
      if (wordIndex < words.length) {
        // Vary pitch naturally (between 1.1 and 1.2)
        const pitchVariation = 1.1 + (Math.random() * 0.1);
        wordIndex++;
      }
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('🔊 Speaking:', text.substring(0, 50) + '...');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      wordIndex = 0;
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const showFeature = (featureKey) => {
    const message = features[featureKey][language];
    setCurrentMessage(message);
    if (speechEnabled) speak(message);
  };

  const handleFeatureClick = (featureKey) => {
    showFeature(featureKey);
    const link = features[featureKey].link;
    if (link) {
      setTimeout(() => {
        window.location.href = link;
      }, 3000); // Go to page after 3 seconds
    }
  };

  useEffect(() => {
    if (isOpen && !currentMessage) {
      showFeature('welcome');
    }
  }, [isOpen, language]);

  useEffect(() => {
    if (window.speechSynthesis) {
      // Load voices with detailed logging
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        console.log('=== ALL AVAILABLE VOICES ===');
        console.log('Total voices:', voices.length);
        
        // Group by language
        const teluguVoices = voices.filter(v => v.lang.includes('te'));
        const hindiVoices = voices.filter(v => v.lang.includes('hi'));
        const indianEnglish = voices.filter(v => v.lang.includes('en-IN'));
        const femaleVoices = voices.filter(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman') ||
          v.name.includes('Samantha') ||
          v.name.includes('Serena')
        );
        
        if (teluguVoices.length > 0) {
          console.log('\n🇮🇳 Telugu Voices:');
          teluguVoices.forEach(v => console.log(`  - ${v.name} (${v.lang})`));
        } else {
          console.log('\n❌ No Telugu voices available');
        }
        
        if (hindiVoices.length > 0) {
          console.log('\n🇮🇳 Hindi Voices:');
          hindiVoices.forEach(v => console.log(`  - ${v.name} (${v.lang})`));
        } else {
          console.log('\n❌ No Hindi voices available');
        }
        
        if (indianEnglish.length > 0) {
          console.log('\n🇮🇳 Indian English Voices:');
          indianEnglish.forEach(v => console.log(`  - ${v.name} (${v.lang})`));
        }
        
        if (femaleVoices.length > 0) {
          console.log('\n👩 Female Voices (Best for natural sound):');
          femaleVoices.slice(0, 5).forEach(v => console.log(`  - ${v.name} (${v.lang})`));
        }
        
        console.log('\n💡 Tip: For best Telugu/Hindi experience:');
        console.log('   - Chrome: Install Google TTS extension');
        console.log('   - Windows: Add Hindi language pack');
        console.log('   - Android: Google Text-to-Speech app');
        console.log('================================\n');
      };
      
      // Load immediately
      loadVoices();
      
      // Chrome needs this event
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Force reload after 1 second (Chrome workaround)
      setTimeout(loadVoices, 1000);
    }
  }, []);

  return (
    <>
      {/* Floating Avatar Icon - Smaller and Professional */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="fixed bottom-28 right-6 z-40 cursor-pointer group"
          title="MemoraAI Speaking Guide - Click to talk!"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-50"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Expanded Assistant Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">MemoraAI Speaking Guide</h3>
                  <p className="text-xs text-white/80">
                    {isSpeaking ? '🔊 Speaking...' : 'Ask me anything'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setSpeechEnabled(!speechEnabled);
                    if (speechEnabled) stopSpeaking();
                  }}
                  className="p-1.5 hover:bg-white/20 rounded transition"
                >
                  {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                    setCurrentMessage('');
                  }}
                  className="p-1.5 hover:bg-white/20 rounded transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex gap-1 mt-2">
              {['english', 'telugu', 'hindi'].map(lang => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    stopSpeaking();
                  }}
                  className={`px-2 py-1 text-xs rounded transition ${
                    language === lang 
                      ? 'bg-white text-purple-600 font-semibold' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {lang === 'english' ? 'English' : lang === 'telugu' ? 'తెలుగు' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={language === 'telugu' ? 'సెర్చ్ చేయండి...' : language === 'hindi' ? 'खोजें...' : 'Search features...'}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFeatureClick(result.feature)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-purple-50 rounded text-left text-sm"
                  >
                    {result.icon}
                    <span className="font-medium">{result.feature.charAt(0).toUpperCase() + result.feature.slice(1)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Area */}
          {currentMessage && (
            <div className="p-3 max-h-40 overflow-y-auto bg-gray-50">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 relative text-sm">
                {isSpeaking && (
                  <div className="absolute -left-1 top-3 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                )}
                <p className="text-gray-700 leading-relaxed">{currentMessage}</p>
              </div>
            </div>
          )}

          {/* Quick Actions - Only if no search */}
          {!searchQuery && (
            <div className="p-3">
              {/* Current Page Help */}
              {features.currentPage[currentPage] && (
                <div className="mb-3">
                  <button
                    onClick={() => {
                      const msg = features.currentPage[currentPage][language];
                      setCurrentMessage(msg);
                      if (speechEnabled) speak(msg);
                    }}
                    className="w-full p-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {language === 'telugu' ? '📍 ఈ పేజీ గురించి తెలుసుకోండి' : language === 'hindi' ? '📍 इस पेज के बारे में जानें' : '📍 Explain This Page'}
                  </button>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mb-2 font-medium">
                {language === 'telugu' ? 'త్వరిత చర్యలు' : language === 'hindi' ? 'त्वरित कार्य' : 'Quick Actions'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleFeatureClick('login')} className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition flex items-center gap-1">
                  <Home className="w-3 h-3" /> Login
                </button>
                <button onClick={() => handleFeatureClick('advisory')} className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> Advisory
                </button>
                <button onClick={() => handleFeatureClick('property')} className="px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Property
                </button>
                <button onClick={() => handleFeatureClick('workforce')} className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-medium transition flex items-center gap-1">
                  <HardHat className="w-3 h-3" /> Workers
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AvatarAssistant;
