// AI Agents Data with Multi-language Support

export const getAgentsData = (language = 'english') => {
  const translations = {
    english: {
      smsAgent: {
        name: 'SMS Automation Agent',
        shortDesc: 'Automated SMS sending for leads, follow-ups, payment reminders, and notifications',
        benefits: [
          'Instant lead acknowledgment SMS within seconds',
          'Automated follow-up reminders to sales team',
          'Payment due date reminders to customers',
          'Booking confirmation SMS',
          'Site visit appointment reminders',
          'OTP for secure authentication'
        ]
      },
      whatsappAgent: {
        name: 'WhatsApp Business Agent',
        shortDesc: 'Rich media messaging via WhatsApp for project brochures, property videos, and customer engagement',
        benefits: [
          'Send project brochures with images and PDFs',
          'Share property videos and virtual tours',
          'Higher engagement rate (98% open rate)',
          'Two-way conversation support',
          'Construction progress updates with images',
          'Interactive buttons for quick responses'
        ]
      },
      marketResearchAgent: {
        name: 'Market Research & Intelligence Agent',
        shortDesc: 'AI-powered competitor analysis, market trends, pricing intelligence, and demand forecasting',
        benefits: [
          'Real-time competitor pricing tracking',
          'Market demand prediction for locations',
          'Identify emerging micro-markets',
          'Customer preference analysis',
          'Inventory benchmarking against competitors',
          'Optimal launch timing recommendations'
        ]
      },
      digitalMarketingAgent: {
        name: 'Digital Marketing Automation Agent',
        shortDesc: 'Multi-channel digital marketing automation for social media, ads, SEO, and brand building',
        benefits: [
          'Automated social media posting (FB, Insta, LinkedIn)',
          'Google & Facebook Ads campaign optimization',
          'SEO-optimized content generation',
          'Influencer collaboration management',
          'Brand sentiment monitoring',
          'ROI tracking across all channels'
        ]
      },
      propertyValuationAgent: {
        name: 'AI Property Valuation Agent',
        shortDesc: 'Machine learning-based property pricing, market value estimation, and appreciation prediction',
        benefits: [
          'Accurate property valuation using 50+ parameters',
          'Future price appreciation prediction',
          'Comparable property analysis',
          'Location score calculation',
          'Optimal pricing recommendations',
          'Market rate alerts for price adjustments'
        ]
      },
      customerServiceBot: {
        name: '24/7 Customer Service Chatbot',
        shortDesc: 'AI chatbot for instant customer support, FAQ handling, and query resolution',
        benefits: [
          '24/7 availability (no human agent needed)',
          'Instant responses to common queries',
          'Multi-language support',
          'Lead capture from website visitors',
          'Escalate complex queries to human agents',
          'Reduce support costs by 70%'
        ]
      },
      biAgent: {
        name: 'Business Intelligence & Reports Agent',
        shortDesc: 'Advanced analytics, custom reports, dashboards, and data visualization for decision-making',
        benefits: [
          'Automated daily/weekly/monthly reports',
          'Custom dashboards for different roles',
          'Sales pipeline visualization',
          'Conversion funnel analysis',
          'Agent performance scorecards',
          'Executive summary reports with insights'
        ]
      },
      virtualTourAgent: {
        name: 'Virtual Tour & 3D Visualization Agent',
        shortDesc: 'Create immersive 3D property tours, AR experiences, and virtual site visits',
        benefits: [
          'Generate 3D virtual tours from floor plans',
          'AR-based property viewing on mobile',
          'Virtual site visit scheduling',
          'Remote customer engagement',
          '360-degree project walkthroughs',
          'Reduce physical site visit costs by 50%'
        ]
      },
      legalComplianceAgent: {
        name: 'Legal Compliance & RERA Agent',
        shortDesc: 'Automated RERA compliance tracking, legal document verification, and regulatory monitoring',
        benefits: [
          'RERA registration status monitoring',
          'Compliance deadline reminders',
          'Legal document verification',
          'Automated statutory reporting',
          'Risk assessment and alerts',
          'Avoid legal penalties and delays'
        ]
      },
      tenantScreeningAgent: {
        name: 'Tenant Screening & Verification Agent',
        shortDesc: 'Automated background checks, credit scoring, and tenant reliability assessment',
        benefits: [
          'Instant background verification',
          'Credit score analysis',
          'Employment verification',
          'Previous landlord reference checks',
          'Risk scoring for tenant reliability',
          'Reduce bad tenant incidents by 80%'
        ]
      },
      networkAgent: {
        name: 'Agent Network Management System',
        shortDesc: 'Manage channel partners, brokers network, commission tracking, and performance monitoring',
        benefits: [
          'Broker network onboarding and KYC',
          'Real-time commission calculation',
          'Lead distribution to channel partners',
          'Performance tracking and rankings',
          'Payout automation',
          'Expand reach through partner network'
        ]
      },
      contentAgent: {
        name: 'Content Generation & Branding Agent',
        shortDesc: 'AI-powered content creation for social media, blogs, property descriptions, and marketing materials',
        benefits: [
          'Auto-generate property descriptions',
          'Create social media posts with images',
          'Blog article writing for SEO',
          'Email campaign content',
          'Video script generation',
          'Brand voice consistency across channels'
        ]
      },
      leadScoringAgent: {
        name: 'Intelligent Lead Scoring Agent',
        shortDesc: 'ML-based lead quality prediction, hot lead identification, and prioritization',
        benefits: [
          'Predict lead conversion probability',
          'Hot lead identification within minutes',
          'Budget qualification scoring',
          'Engagement level tracking',
          'Optimal contact time prediction',
          'Increase conversion rate by 40%'
        ]
      },
      siteSelectionAgent: {
        name: 'Site Selection & Location Intelligence Agent',
        shortDesc: 'Data-driven site selection, demographic analysis, and location scoring for new projects',
        benefits: [
          'Demographic analysis of locations',
          'Proximity to amenities scoring',
          'Infrastructure development tracking',
          'Demand-supply gap analysis',
          'Price appreciation potential',
          'Competitive landscape mapping'
        ]
      },
      referralAgent: {
        name: 'Customer Referral & Loyalty Agent',
        shortDesc: 'Automated referral program management, rewards tracking, and customer loyalty building',
        benefits: [
          'Automated referral link generation',
          'Track referral conversions',
          'Reward points management',
          'Loyalty program automation',
          'Customer retention campaigns',
          'Increase referrals by 3x'
        ]
      }
    },
    telugu: {
      smsAgent: {
        name: 'SMS ఆటోమేషన్ ఏజెంట్',
        shortDesc: 'లీడ్స్, ఫాలో-అప్స్, పేమెంట్ రిమైండర్స్ మరియు నోటిఫికేషన్స్ కోసం ఆటోమేటిక్ SMS పంపడం',
        benefits: [
          'కొత్త లీడ్ వచ్చిన సెకన్లలోనే SMS పంపడం',
          'సేల్స్ టీమ్‌కు ఆటోమేటిక్ ఫాలో-అప్ రిమైండర్స్',
          'కస్టమర్లకు పేమెంట్ డ్యూ డేట్ రిమైండర్స్',
          'బుకింగ్ కన్ఫర్మేషన్ SMS',
          'సైట్ విజిట్ అపాయింట్‌మెంట్ రిమైండర్స్',
          'సురక్షిత లాగిన్ కోసం OTP'
        ]
      },
      whatsappAgent: {
        name: 'వాట్సాప్ బిజినెస్ ఏజెంట్',
        shortDesc: 'ప్రాజెక్ట్ బ్రోచర్లు, ప్రాపర్టీ వీడియోలు మరియు కస్టమర్ ఎంగేజ్‌మెంట్ కోసం వాట్సాప్ ద్వారా రిచ్ మీడియా మెసేజింగ్',
        benefits: [
          'ఇమేజెస్ మరియు PDFలతో ప్రాజెక్ట్ బ్రోచర్లు పంపడం',
          'ప్రాపర్టీ వీడియోలు మరియు వర్చువల్ టూర్స్ షేర్ చేయడం',
          'అధిక ఎంగేజ్‌మెంట్ రేట్ (98% ఓపెన్ రేట్)',
          'రెండు-మార్గం సంభాషణ సపోర్ట్',
          'ఫోటోలతో నిర్మాణ పురోగతి అప్‌డేట్‌లు',
          'త్వరిత స్పందనల కోసం ఇంటరాక్టివ్ బటన్లు'
        ]
      },
      marketResearchAgent: {
        name: 'మార్కెట్ రీసెర్చ్ & ఇంటెలిజెన్స్ ఏజెంట్',
        shortDesc: 'కాంపిటేటర్ అనాలిసిస్, మార్కెట్ ట్రెండ్స్, ప్రైసింగ్ ఇంటెలిజెన్స్ మరియు డిమాండ్ ఫోర్‌కాస్టింగ్ కోసం AI',
        benefits: [
          'రియల్-టైం కాంపిటేటర్ ప్రైసింగ్ ట్రాకింగ్',
          'లొకేషన్ల కోసం మార్కెట్ డిమాండ్ అంచనా',
          'ఎమర్జింగ్ మైక్రో-మార్కెట్లను గుర్తించడం',
          'కస్టమర్ ప్రాధాన్యత విశ్లేషణ',
          'కాంపిటేటర్లతో ఇన్వెంటరీ బెంచ్‌మార్కింగ్',
          'సరైన లాంచ్ టైమింగ్ సిఫార్సులు'
        ]
      },
      digitalMarketingAgent: {
        name: 'డిజిటల్ మార్కెటింగ్ ఆటోమేషన్ ఏజెంట్',
        shortDesc: 'సోషల్ మీడియా, యాడ్స్, SEO మరియు బ్రాండ్ బిల్డింగ్ కోసం మల్టీ-ఛానల్ డిజిటల్ మార్కెటింగ్ ఆటోమేషన్',
        benefits: [
          'ఆటోమేటిక్ సోషల్ మీడియా పోస్టింగ్ (FB, Insta, LinkedIn)',
          'Google & Facebook Ads క్యాంపెయిన్ ఆప్టిమైజేషన్',
          'SEO-ఆప్టిమైజ్డ్ కంటెంట్ జనరేషన్',
          'ఇన్‌ఫ్లుయెన్సర్ సహకార నిర్వహణ',
          'బ్రాండ్ సెంటిమెంట్ మానిటరింగ్',
          'అన్ని ఛానల్స్‌లో ROI ట్రాకింగ్'
        ]
      },
      propertyValuationAgent: {
        name: 'AI ప్రాపర్టీ వాల్యుయేషన్ ఏజెంట్',
        shortDesc: 'ప్రాపర్టీ ప్రైసింగ్, మార్కెట్ వాల్యూ అంచనా మరియు అప్రిసియేషన్ ప్రిడిక్షన్ కోసం మెషీన్ లెర్నింగ్',
        benefits: [
          '50+ పారామీటర్లు ఉపయోగించి ఖచ్చితమైన ప్రాపర్టీ వాల్యుయేషన్',
          'భవిష్యత్ ధర అప్రిసియేషన్ అంచనా',
          'పోల్చదగిన ప్రాపర్టీ విశ్లేషణ',
          'లొకేషన్ స్కోర్ లెక్కింపు',
          'సరైన ప్రైసింగ్ సిఫార్సులు',
          'ధర సర్దుబాట్ల కోసం మార్కెట్ రేట్ అలర్ట్‌లు'
        ]
      },
      customerServiceBot: {
        name: '24/7 కస్టమర్ సర్వీస్ చాట్‌బాట్',
        shortDesc: 'తక్షణ కస్టమర్ సపోర్ట్, FAQ హ్యాండ్లింగ్ మరియు క్వెరీ రిజల్యూషన్ కోసం AI చాట్‌బాట్',
        benefits: [
          '24/7 అందుబాటు (మానవ ఏజెంట్ అవసరం లేదు)',
          'సాధారణ ప్రశ్నలకు తక్షణ సమాధానాలు',
          'మల్టీ-లాంగ్వేజ్ సపోర్ట్',
          'వెబ్‌సైట్ సందర్శకుల నుండి లీడ్ క్యాప్చర్',
          'సంక్లిష్ట ప్రశ్నలను మానవ ఏజెంట్‌లకు ఎస్కలేట్ చేయడం',
          'సపోర్ట్ ఖర్చులను 70% తగ్గించడం'
        ]
      },
      biAgent: {
        name: 'బిజినెస్ ఇంటెలిజెన్స్ & రిపోర్ట్స్ ఏజెంట్',
        shortDesc: 'నిర్ణయం తీసుకోవడానికి అడ్వాన్స్‌డ్ అనలిటిక్స్, కస్టమ్ రిపోర్ట్‌లు, డాష్‌బోర్డ్‌లు మరియు డేటా విజువలైజేషన్',
        benefits: [
          'ఆటోమేటిక్ రోజువారీ/వారపు/నెలవారీ రిపోర్ట్‌లు',
          'వివిధ రోల్స్ కోసం కస్టమ్ డాష్‌బోర్డ్‌లు',
          'సేల్స్ పైప్‌లైన్ విజువలైజేషన్',
          'కన్వర్షన్ ఫన్నెల్ అనాలిసిస్',
          'ఏజెంట్ పెర్ఫార్మెన్స్ స్కోర్‌కార్డ్‌లు',
          'ఇన్‌సైట్‌లతో ఎగ్జిక్యూటివ్ సమ్మరీ రిపోర్ట్‌లు'
        ]
      },
      virtualTourAgent: {
        name: 'వర్చువల్ టూర్ & 3D విజువలైజేషన్ ఏజెంట్',
        shortDesc: 'ఇమ్మర్సివ్ 3D ప్రాపర్టీ టూర్స్, AR అనుభవాలు మరియు వర్చువల్ సైట్ విజిట్‌లను సృష్టించడం',
        benefits: [
          'ఫ్లోర్ ప్లాన్‌ల నుండి 3D వర్చువల్ టూర్స్ జనరేట్ చేయడం',
          'మొబైల్‌లో AR-ఆధారిత ప్రాపర్టీ వ్యూయింగ్',
          'వర్చువల్ సైట్ విజిట్ షెడ్యూలింగ్',
          'రిమోట్ కస్టమర్ ఎంగేజ్‌మెంట్',
          '360-డిగ్రీ ప్రాజెక్ట్ వాక్‌త్రూస్',
          'ఫిజికల్ సైట్ విజిట్ ఖర్చులను 50% తగ్గించడం'
        ]
      },
      legalComplianceAgent: {
        name: 'లీగల్ కాంప్లయన్స్ & RERA ఏజెంట్',
        shortDesc: 'ఆటోమేటిక్ RERA కాంప్లయన్స్ ట్రాకింగ్, లీగల్ డాక్యుమెంట్ వెరిఫికేషన్ మరియు రెగ్యులేటరీ మానిటరింగ్',
        benefits: [
          'RERA రిజిస్ట్రేషన్ స్టేటస్ మానిటరింగ్',
          'కాంప్లయన్స్ డెడ్‌లైన్ రిమైండర్స్',
          'లీగల్ డాక్యుమెంట్ వెరిఫికేషన్',
          'ఆటోమేటిక్ స్టాట్యూటరీ రిపోర్టింగ్',
          'రిస్క్ అసెస్‌మెంట్ మరియు అలర్ట్‌లు',
          'లీగల్ పెనాల్టీలు మరియు ఆలస్యాలను నివారించడం'
        ]
      },
      tenantScreeningAgent: {
        name: 'టెనెంట్ స్క్రీనింగ్ & వెరిఫికేషన్ ఏజెంట్',
        shortDesc: 'ఆటోమేటిక్ బ్యాక్‌గ్రౌండ్ చెక్స్, క్రెడిట్ స్కోరింగ్ మరియు టెనెంట్ రిలయబిలిటీ అసెస్‌మెంట్',
        benefits: [
          'తక్షణ బ్యాక్‌గ్రౌండ్ వెరిఫికేషన్',
          'క్రెడిట్ స్కోర్ అనాలిసిస్',
          'ఉద్యోగ వెరిఫికేషన్',
          'మునుపటి లాండ్‌లార్డ్ రిఫరెన్స్ చెక్స్',
          'టెనెంట్ రిలయబిలిటీ కోసం రిస్క్ స్కోరింగ్',
          'చెడు టెనెంట్ సంఘటనలను 80% తగ్గించడం'
        ]
      },
      networkAgent: {
        name: 'ఏజెంట్ నెట్‌వర్క్ మేనేజ్‌మెంట్ సిస్టమ్',
        shortDesc: 'ఛానల్ పార్ట్‌నర్‌లు, బ్రోకర్ నెట్‌వర్క్, కమిషన్ ట్రాకింగ్ మరియు పెర్ఫార్మెన్స్ మానిటరింగ్ నిర్వహణ',
        benefits: [
          'బ్రోకర్ నెట్‌వర్క్ ఆన్‌బోర్డింగ్ మరియు KYC',
          'రియల్-టైం కమిషన్ లెక్కింపు',
          'ఛానల్ పార్ట్‌నర్‌లకు లీడ్ పంపిణీ',
          'పెర్ఫార్మెన్స్ ట్రాకింగ్ మరియు ర్యాంకింగ్‌లు',
          'పేఅవుట్ ఆటోమేషన్',
          'పార్ట్‌నర్ నెట్‌వర్క్ ద్వారా విస్తరణ'
        ]
      },
      contentAgent: {
        name: 'కంటెంట్ జనరేషన్ & బ్రాండింగ్ ఏజెంట్',
        shortDesc: 'సోషల్ మీడియా, బ్లాగ్‌లు, ప్రాపర్టీ వివరణలు మరియు మార్కెటింగ్ మెటీరియల్స్ కోసం AI-పవర్డ్ కంటెంట్ క్రియేషన్',
        benefits: [
          'ప్రాపర్టీ వివరణలను ఆటో-జనరేట్ చేయడం',
          'ఇమేజెస్‌తో సోషల్ మీడియా పోస్ట్‌లు సృష్టించడం',
          'SEO కోసం బ్లాగ్ ఆర్టికల్ రైటింగ్',
          'ఇమెయిల్ క్యాంపెయిన్ కంటెంట్',
          'వీడియో స్క్రిప్ట్ జనరేషన్',
          'అన్ని ఛానల్స్‌లో బ్రాండ్ వాయిస్ కన్సిస్టెన్సీ'
        ]
      },
      leadScoringAgent: {
        name: 'ఇంటెలిజెంట్ లీడ్ స్కోరింగ్ ఏజెంట్',
        shortDesc: 'ML-ఆధారిత లీడ్ క్వాలిటీ ప్రిడిక్షన్, హాట్ లీడ్ గుర్తింపు మరియు ప్రాధాన్యత',
        benefits: [
          'లీడ్ కన్వర్షన్ సంభావ్యతను అంచనా వేయడం',
          'నిమిషాల్లో హాట్ లీడ్ గుర్తింపు',
          'బడ్జెట్ క్వాలిఫికేషన్ స్కోరింగ్',
          'ఎంగేజ్‌మెంట్ స్థాయి ట్రాకింగ్',
          'సరైన సంప్రదింపు సమయ అంచనా',
          'కన్వర్షన్ రేట్‌ను 40% పెంచడం'
        ]
      },
      siteSelectionAgent: {
        name: 'సైట్ సెలక్షన్ & లొకేషన్ ఇంటెలిజెన్స్ ఏజెంట్',
        shortDesc: 'కొత్త ప్రాజెక్ట్‌ల కోసం డేటా-డ్రివెన్ సైట్ సెలక్షన్, డెమోగ్రాఫిక్ అనాలిసిస్ మరియు లొకేషన్ స్కోరింగ్',
        benefits: [
          'లొకేషన్ల డెమోగ్రాఫిక్ అనాలిసిస్',
          'అమెనిటీలకు సామీప్య స్కోరింగ్',
          'ఇన్‌ఫ్రాస్ట్రక్చర్ అభివృద్ధి ట్రాకింగ్',
          'డిమాండ్-సప్లై గ్యాప్ అనాలిసిస్',
          'ధర అప్రిసియేషన్ సంభావ్యత',
          'కాంపిటేటివ్ ల్యాండ్‌స్కేప్ మ్యాపింగ్'
        ]
      },
      referralAgent: {
        name: 'కస్టమర్ రిఫెరల్ & లాయల్టీ ఏజెంట్',
        shortDesc: 'ఆటోమేటిక్ రిఫెరల్ ప్రోగ్రామ్ మేనేజ్‌మెంట్, రివార్డ్స్ ట్రాకింగ్ మరియు కస్టమర్ లాయల్టీ బిల్డింగ్',
        benefits: [
          'ఆటోమేటిక్ రిఫెరల్ లింక్ జనరేషన్',
          'రిఫెరల్ కన్వర్షన్‌లను ట్రాక్ చేయడం',
          'రివార్డ్ పాయింట్స్ మేనేజ్‌మెంట్',
          'లాయల్టీ ప్రోగ్రామ్ ఆటోమేషన్',
          'కస్టమర్ రిటెన్షన్ క్యాంపెయిన్‌లు',
          'రిఫెరల్‌లను 3x పెంచడం'
        ]
      }
    },
    hindi: {
      smsAgent: {
        name: 'SMS ऑटोमेशन एजेंट',
        shortDesc: 'लीड्स, फॉलो-अप्स, पेमेंट रिमाइंडर्स और नोटिफिकेशन्स के लिए स्वचालित SMS भेजना',
        benefits: [
          'नई लीड के कुछ सेकंड में ही SMS भेजना',
          'सेल्स टीम को स्वचालित फॉलो-अप रिमाइंडर्स',
          'ग्राहकों को पेमेंट ड्यू डेट रिमाइंडर्स',
          'बुकिंग कन्फर्मेशन SMS',
          'साइट विज़िट अपॉइंटमेंट रिमाइंडर्स',
          'सुरक्षित लॉगिन के लिए OTP'
        ]
      },
      whatsappAgent: {
        name: 'व्हाट्सएप बिजनेस एजेंट',
        shortDesc: 'प्रोजेक्ट ब्रोशर, प्रॉपर्टी वीडियो और ग्राहक जुड़ाव के लिए व्हाट्सएप के माध्यम से रिच मीडिया मैसेजिंग',
        benefits: [
          'छवियों और PDFs के साथ प्रोजेक्ट ब्रोशर भेजना',
          'प्रॉपर्टी वीडियो और वर्चुअल टूर्स शेयर करना',
          'उच्च सहभागिता दर (98% ओपन रेट)',
          'दो-तरफ़ा बातचीत समर्थन',
          'फोटो के साथ निर्माण प्रगति अपडेट',
          'त्वरित प्रतिक्रियाओं के लिए इंटरैक्टिव बटन'
        ]
      },
      marketResearchAgent: {
        name: 'मार्केट रिसर्च & इंटेलिजेंस एजेंट',
        shortDesc: 'प्रतियोगी विश्लेषण, बाजार रुझान, मूल्य निर्धारण बुद्धिमत्ता और मांग पूर्वानुमान के लिए AI',
        benefits: [
          'रियल-टाइम प्रतियोगी मूल्य ट्रैकिंग',
          'स्थानों के लिए बाजार मांग की भविष्यवाणी',
          'उभरते माइक्रो-मार्केट्स की पहचान',
          'ग्राहक वरीयता विश्लेषण',
          'प्रतियोगियों के साथ इन्वेंटरी बेंचमार्किंग',
          'इष्टतम लॉन्च समय की सिफारिशें'
        ]
      },
      digitalMarketingAgent: {
        name: 'डिजिटल मार्केटिंग ऑटोमेशन एजेंट',
        shortDesc: 'सोशल मीडिया, विज्ञापन, SEO और ब्रांड निर्माण के लिए मल्टी-चैनल डिजिटल मार्केटिंग ऑटोमेशन',
        benefits: [
          'स्वचालित सोशल मीडिया पोस्टिंग (FB, Insta, LinkedIn)',
          'Google और Facebook Ads अभियान अनुकूलन',
          'SEO-अनुकूलित सामग्री निर्माण',
          'प्रभावशाली सहयोग प्रबंधन',
          'ब्रांड भावना निगरानी',
          'सभी चैनलों में ROI ट्रैकिंग'
        ]
      },
      propertyValuationAgent: {
        name: 'AI प्रॉपर्टी वैल्यूएशन एजेंट',
        shortDesc: 'प्रॉपर्टी मूल्य निर्धारण, बाजार मूल्य अनुमान और मूल्य वृद्धि पूर्वानुमान के लिए मशीन लर्निंग',
        benefits: [
          '50+ पैरामीटर्स का उपयोग करके सटीक प्रॉपर्टी मूल्यांकन',
          'भविष्य की कीमत वृद्धि की भविष्यवाणी',
          'तुलनीय प्रॉपर्टी विश्लेषण',
          'स्थान स्कोर गणना',
          'इष्टतम मूल्य निर्धारण सिफारिशें',
          'मूल्य समायोजन के लिए बाजार दर अलर्ट'
        ]
      },
      customerServiceBot: {
        name: '24/7 कस्टमर सर्विस चैटबॉट',
        shortDesc: 'तत्काल ग्राहक सहायता, FAQ हैंडलिंग और क्वेरी समाधान के लिए AI चैटबॉट',
        benefits: [
          '24/7 उपलब्धता (कोई मानव एजेंट की आवश्यकता नहीं)',
          'सामान्य प्रश्नों के तुरंत उत्तर',
          'बहु-भाषा समर्थन',
          'वेबसाइट आगंतुकों से लीड कैप्चर',
          'जटिल प्रश्नों को मानव एजेंटों को एस्केलेट करना',
          'समर्थन लागत में 70% की कमी'
        ]
      },
      biAgent: {
        name: 'बिजनेस इंटेलिजेंस & रिपोर्ट्स एजेंट',
        shortDesc: 'निर्णय लेने के लिए उन्नत विश्लेषण, कस्टम रिपोर्ट, डैशबोर्ड और डेटा विज़ुअलाइज़ेशन',
        benefits: [
          'स्वचालित दैनिक/साप्ताहिक/मासिक रिपोर्ट',
          'विभिन्न भूमिकाओं के लिए कस्टम डैशबोर्ड',
          'सेल्स पाइपलाइन विज़ुअलाइज़ेशन',
          'रूपांतरण फ़नल विश्लेषण',
          'एजेंट प्रदर्शन स्कोरकार्ड',
          'अंतर्दृष्टि के साथ कार्यकारी सारांश रिपोर्ट'
        ]
      },
      virtualTourAgent: {
        name: 'वर्चुअल टूर & 3D विज़ुअलाइज़ेशन एजेंट',
        shortDesc: 'इमर्सिव 3D प्रॉपर्टी टूर, AR अनुभव और वर्चुअल साइट विज़िट बनाना',
        benefits: [
          'फ्लोर प्लान से 3D वर्चुअल टूर जेनरेट करना',
          'मोबाइल पर AR-आधारित प्रॉपर्टी देखना',
          'वर्चुअल साइट विज़िट शेड्यूलिंग',
          'रिमोट कस्टमर एंगेजमेंट',
          '360-डिग्री प्रोजेक्ट वॉकथ्रू',
          'फिजिकल साइट विज़िट लागत में 50% की कमी'
        ]
      },
      legalComplianceAgent: {
        name: 'लीगल कंप्लायंस & RERA एजेंट',
        shortDesc: 'स्वचालित RERA अनुपालन ट्रैकिंग, कानूनी दस्तावेज़ सत्यापन और नियामक निगरानी',
        benefits: [
          'RERA पंजीकरण स्थिति निगरानी',
          'अनुपालन समय सीमा रिमाइंडर',
          'कानूनी दस्तावेज़ सत्यापन',
          'स्वचालित वैधानिक रिपोर्टिंग',
          'जोखिम मूल्यांकन और अलर्ट',
          'कानूनी जुर्माने और देरी से बचना'
        ]
      },
      tenantScreeningAgent: {
        name: 'टेनेंट स्क्रीनिंग & वेरिफिकेशन एजेंट',
        shortDesc: 'स्वचालित बैकग्राउंड चेक, क्रेडिट स्कोरिंग और किरायेदार विश्वसनीयता मूल्यांकन',
        benefits: [
          'तत्काल बैकग्राउंड सत्यापन',
          'क्रेडिट स्कोर विश्लेषण',
          'रोज़गार सत्यापन',
          'पिछले मकान मालिक संदर्भ जांच',
          'किरायेदार विश्वसनीयता के लिए जोखिम स्कोरिंग',
          'खराब किरायेदार घटनाओं में 80% की कमी'
        ]
      },
      networkAgent: {
        name: 'एजेंट नेटवर्क मैनेजमेंट सिस्टम',
        shortDesc: 'चैनल पार्टनर, ब्रोकर नेटवर्क, कमीशन ट्रैकिंग और प्रदर्शन निगरानी का प्रबंधन',
        benefits: [
          'ब्रोकर नेटवर्क ऑनबोर्डिंग और KYC',
          'रियल-टाइम कमीशन गणना',
          'चैनल पार्टनर्स को लीड वितरण',
          'प्रदर्शन ट्रैकिंग और रैंकिंग',
          'भुगतान स्वचालन',
          'पार्टनर नेटवर्क के माध्यम से विस्तार'
        ]
      },
      contentAgent: {
        name: 'कंटेंट जेनरेशन & ब्रांडिंग एजेंट',
        shortDesc: 'सोशल मीडिया, ब्लॉग, प्रॉपर्टी विवरण और मार्केटिंग सामग्री के लिए AI-संचालित सामग्री निर्माण',
        benefits: [
          'प्रॉपर्टी विवरण स्वतः उत्पन्न करना',
          'छवियों के साथ सोशल मीडिया पोस्ट बनाना',
          'SEO के लिए ब्लॉग लेख लेखन',
          'ईमेल अभियान सामग्री',
          'वीडियो स्क्रिप्ट निर्माण',
          'सभी चैनलों में ब्रांड आवाज़ की स्थिरता'
        ]
      },
      leadScoringAgent: {
        name: 'इंटेलिजेंट लीड स्कोरिंग एजेंट',
        shortDesc: 'ML-आधारित लीड गुणवत्ता भविष्यवाणी, हॉट लीड पहचान और प्राथमिकता',
        benefits: [
          'लीड रूपांतरण संभावना की भविष्यवाणी',
          'मिनटों में हॉट लीड पहचान',
          'बजट योग्यता स्कोरिंग',
          'सहभागिता स्तर ट्रैकिंग',
          'इष्टतम संपर्क समय की भविष्यवाणी',
          'रूपांतरण दर में 40% की वृद्धि'
        ]
      },
      siteSelectionAgent: {
        name: 'साइट सेलेक्शन & लोकेशन इंटेलिजेंस एजेंट',
        shortDesc: 'नए प्रोजेक्ट्स के लिए डेटा-संचालित साइट चयन, जनसांख्यिकीय विश्लेषण और स्थान स्कोरिंग',
        benefits: [
          'स्थानों का जनसांख्यिकीय विश्लेषण',
          'सुविधाओं की निकटता स्कोरिंग',
          'बुनियादी ढांचे के विकास की ट्रैकिंग',
          'मांग-आपूर्ति अंतर विश्लेषण',
          'मूल्य वृद्धि क्षमता',
          'प्रतिस्पर्धी परिदृश्य मैपिंग'
        ]
      },
      referralAgent: {
        name: 'कस्टमर रेफरल & लॉयल्टी एजेंट',
        shortDesc: 'स्वचालित रेफरल प्रोग्राम प्रबंधन, पुरस्कार ट्रैकिंग और ग्राहक वफादारी निर्माण',
        benefits: [
          'स्वचालित रेफरल लिंक निर्माण',
          'रेफरल रूपांतरण को ट्रैक करना',
          'पुरस्कार अंक प्रबंधन',
          'वफादारी कार्यक्रम स्वचालन',
          'ग्राहक प्रतिधारण अभियान',
          'रेफरल में 3x की वृद्धि'
        ]
      }
    }
  };

  const lang = translations[language] || translations.english;

  return [
    {
      id: 'sms-agent',
      ...lang.smsAgent,
      icon: 'MessageSquare',
      color: 'from-blue-500 to-blue-600',
      status: 'coming_soon',
      category: ['company', 'agent', 'customer'],
      level: 'operational'
    },
    {
      id: 'whatsapp-agent',
      ...lang.whatsappAgent,
      icon: 'Send',
      color: 'from-green-500 to-green-600',
      status: 'coming_soon',
      category: ['company', 'agent', 'customer', 'marketing'],
      level: 'operational'
    },
    {
      id: 'market-research-agent',
      ...lang.marketResearchAgent,
      icon: 'Search',
      color: 'from-cyan-500 to-cyan-600',
      status: 'coming_soon',
      category: ['company', 'saas_admin'],
      level: 'strategic'
    },
    {
      id: 'digital-marketing-agent',
      ...lang.digitalMarketingAgent,
      icon: 'Share2',
      color: 'from-pink-500 to-pink-600',
      status: 'coming_soon',
      category: ['company', 'marketing'],
      level: 'strategic'
    },
    {
      id: 'property-valuation-agent',
      ...lang.propertyValuationAgent,
      icon: 'DollarSign',
      color: 'from-green-600 to-green-700',
      status: 'coming_soon',
      category: ['company', 'agent', 'project'],
      level: 'strategic'
    },
    {
      id: 'customer-service-bot',
      ...lang.customerServiceBot,
      icon: 'Bot',
      color: 'from-purple-500 to-purple-600',
      status: 'coming_soon',
      category: ['customer', 'company'],
      level: 'operational'
    },
    {
      id: 'bi-agent',
      ...lang.biAgent,
      icon: 'BarChart2',
      color: 'from-indigo-500 to-indigo-600',
      status: 'coming_soon',
      category: ['company', 'saas_admin'],
      level: 'strategic'
    },
    {
      id: 'virtual-tour-agent',
      ...lang.virtualTourAgent,
      icon: 'Eye',
      color: 'from-indigo-500 to-orange-600',
      status: 'coming_soon',
      category: ['customer', 'marketing', 'project'],
      level: 'operational'
    },
    {
      id: 'legal-compliance-agent',
      ...lang.legalComplianceAgent,
      icon: 'Scale',
      color: 'from-gray-600 to-gray-700',
      status: 'coming_soon',
      category: ['company', 'project'],
      level: 'compliance'
    },
    {
      id: 'tenant-screening-agent',
      ...lang.tenantScreeningAgent,
      icon: 'UserCheck',
      color: 'from-teal-500 to-teal-600',
      status: 'coming_soon',
      category: ['company', 'agent'],
      level: 'operational'
    },
    {
      id: 'network-agent',
      ...lang.networkAgent,
      icon: 'Network',
      color: 'from-blue-600 to-blue-700',
      status: 'coming_soon',
      category: ['company', 'network', 'saas_admin'],
      level: 'strategic'
    },
    {
      id: 'content-agent',
      ...lang.contentAgent,
      icon: 'Image',
      color: 'from-rose-500 to-rose-600',
      status: 'coming_soon',
      category: ['marketing', 'company'],
      level: 'operational'
    },
    {
      id: 'lead-scoring-agent',
      ...lang.leadScoringAgent,
      icon: 'Target',
      color: 'from-sky-500 to-sky-600',
      status: 'coming_soon',
      category: ['agent', 'company'],
      level: 'strategic'
    },
    {
      id: 'site-selection-agent',
      ...lang.siteSelectionAgent,
      icon: 'MapPin',
      color: 'from-emerald-500 to-emerald-600',
      status: 'coming_soon',
      category: ['company', 'project', 'saas_admin'],
      level: 'strategic'
    },
    {
      id: 'referral-agent',
      ...lang.referralAgent,
      icon: 'Award',
      color: 'from-violet-500 to-violet-600',
      status: 'coming_soon',
      category: ['customer', 'company', 'marketing'],
      level: 'operational'
    }
  ];
};
