import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

const CATEGORIES_CONFIG = {
  budget: {
    name: 'Budget Advisory',
    icon: '💰',
    fields: [
      { key: 'budget', label: 'Your Budget', type: 'budget', placeholder: 'Enter amount' },
      { key: 'location', label: 'Preferred Location', type: 'text', placeholder: 'e.g., Banjara Hills, Hitech City' },
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'Villa', 'Plot', 'Farm Land'] },
      { key: 'description', label: 'Additional Details', type: 'textarea', placeholder: 'Any specific requirements... (Optional)', required: false, rows: 2 }
    ]
  },
  location: {
    name: 'Location Highlights',
    icon: '📍',
    fields: [
      { key: 'location', label: 'Interested Location', type: 'text', placeholder: 'e.g., Gachibowli, Banjara Hills' },
      { key: 'work_location', label: 'Work Location', type: 'text', placeholder: 'e.g., Hitech City, Madhapur' },
      { key: 'priorities', label: 'Priorities', type: 'text', placeholder: 'e.g., Schools, Hospitals, Metro' },
      { key: 'description', label: 'Additional Details', type: 'textarea', placeholder: 'Any specific requirements... (Optional)', required: false, rows: 2 }
    ]
  },
  numerology: {
    name: 'Numerology Advisory',
    icon: '🔢',
    fields: [
      { key: 'dob', label: 'Date of Birth', type: 'date' },
      { key: 'lucky_numbers', label: 'Lucky Numbers', type: 'text', placeholder: 'e.g., 3, 7, 9' },
      { key: 'direction', label: 'Preferred Direction', type: 'select', options: ['North', 'South', 'East', 'West', 'Any'] },
      { key: 'description', label: 'Additional Details / Questions', type: 'textarea', placeholder: 'Write any specific requirements or questions you have...', required: false }
    ]
  },
  best_project: {
    name: 'Best Project Advisory',
    icon: '⭐',
    fields: [
      { key: 'requirements', label: 'Your Requirements', type: 'textarea', placeholder: 'Describe what you need...' },
      { key: 'timeline', label: 'Purchase Timeline', type: 'select', options: ['Immediate', '3-6 months', '6-12 months', '1+ year'] },
      { key: 'priorities', label: 'Priority Factors', type: 'text', placeholder: 'e.g., Investment, Location' },
      { key: 'description', label: 'Additional Details / Questions', type: 'textarea', placeholder: 'Write any specific requirements or questions you have...', required: false }
    ]
  },
  investment: {
    name: 'Future Investment Advisory',
    icon: '📈',
    fields: [
      { key: 'investment_amount', label: 'Investment Amount', type: 'budget', placeholder: 'Enter amount' },
      { key: 'timeline', label: 'Investment Timeline', type: 'select', options: ['Short-term (1-2 years)', 'Medium-term (3-5 years)', 'Long-term (5+ years)'] },
      { key: 'roi_expectations', label: 'Expected ROI', type: 'text', placeholder: 'e.g., 20% in 3 years' },
      { key: 'description', label: 'Additional Details', type: 'textarea', placeholder: 'Any specific requirements... (Optional)', required: false, rows: 2 }
    ]
  }
};

const AdvisoryChat = () => {
  const { category } = useParams();
  const config = CATEGORIES_CONFIG[category];
  
  const [step, setStep] = useState('input');
  const [formData, setFormData] = useState({});
  const [aiResponse, setAiResponse] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Budget field state (amount + unit)
  const [budgetUnits, setBudgetUnits] = useState({});
  
  // Refs for Google Maps autocomplete
  const locationInputRefs = useRef({});
  const autocompleteRefs = useRef({});

  if (!config) {
    return <div className="p-8 text-center">Invalid advisory category</div>;
  }

  // Initialize Google Maps API
  useEffect(() => {
    if (!window.google && GOOGLE_MAPS_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeAutocomplete();
      document.head.appendChild(script);
    } else if (window.google) {
      initializeAutocomplete();
    }
  }, [category]);

  const initializeAutocomplete = () => {
    if (!window.google) return;

    // Find all location-related fields
    const locationFields = config.fields.filter(field => 
      field.key.includes('location') || field.label.toLowerCase().includes('location')
    );

    locationFields.forEach(field => {
      const inputRef = locationInputRefs.current[field.key];
      if (inputRef && window.google) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef, {
          types: ['geocode', 'establishment'], // Changed from '(cities)' to show localities, neighborhoods
          componentRestrictions: { country: 'in' }
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address || place.name) {
            setFormData(prev => ({
              ...prev,
              [field.key]: place.formatted_address || place.name
            }));
          }
        });

        autocompleteRefs.current[field.key] = autocomplete;
      }
    });
  };

  const handleInputChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleGetAdvice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('Our Expert team is working on it, they will update you in few seconds...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/advisory/get-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          user_inputs: formData
        })
      });
      
      const data = await response.json();
      setAiResponse(data.ai_response);
      setSessionId(data.id);
      setStep('response');
    } catch (error) {
      toast.error('Failed to get advice. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await fetch(`${BACKEND_URL}/api/advisory/capture-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          ...leadData
        })
      });
      
      toast.success("Thank you! We'll contact you soon.");
      setStep('complete');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <Link to="/advisory" className="inline-flex items-center text-gray-600 hover:text-blue-600">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Advisory Hub
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm font-bold mb-3">
              ✨ 100% FREE - AI-Powered Advisory
            </div>
            <div className="text-6xl mb-4">{config.icon}</div>
            <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
            <p className="text-gray-600 mt-2 text-sm">Get instant expert advice powered by advanced AI</p>
          </div>

          {step === 'input' && (
            <form onSubmit={handleGetAdvice}>
              
              {/* 2-column grid for non-textarea fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {config.fields.filter(f => f.type !== 'textarea').map((field) => (
                  <div key={field.key}>
                    <label className="block text-gray-700 font-medium mb-2">
                      {field.label}
                      {field.required === false && <span className="text-gray-400 text-sm ml-2">(Optional)</span>}
                    </label>
                    {field.type === 'budget' ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required={field.required !== false}
                          value={formData[field.key]?.split(' ')[0] || ''}
                          onChange={(e) => {
                            const unit = budgetUnits[field.key] || 'Lakhs';
                            handleInputChange(field.key, `${e.target.value} ${unit}`);
                          }}
                          placeholder={field.placeholder}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <select
                          value={budgetUnits[field.key] || 'Lakhs'}
                          onChange={(e) => {
                            setBudgetUnits({...budgetUnits, [field.key]: e.target.value});
                            const amount = formData[field.key]?.split(' ')[0] || '';
                            if (amount) handleInputChange(field.key, `${amount} ${e.target.value}`);
                          }}
                          className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="Thousand">Thousand</option>
                          <option value="Lakhs">Lakhs</option>
                          <option value="Crores">Crores</option>
                        </select>
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required !== false}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required !== false}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        ref={(el) => {
                          if (field.key.includes('location') || field.label.toLowerCase().includes('location')) {
                            locationInputRefs.current[field.key] = el;
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Textarea fields full width */}
              {config.fields.filter(f => f.type === 'textarea').map((field) => (
                <div key={field.key} className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    {field.label}
                    {field.required === false && <span className="text-gray-400 text-sm ml-2">(Optional)</span>}
                  </label>
                  <textarea
                    required={field.required !== false}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.rows || 2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader className="animate-spin mr-2" />
                    Getting Expert Advice...
                  </span>
                ) : (
                  'Get Free 24×7 Expert Advice'
                )}
              </button>
              
              {loading && loadingMessage && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-blue-800 font-medium">{loadingMessage}</p>
                </div>
              )}
            </form>
          )}

          {step === 'response' && (
            <div>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Expert Advisory Response:</h2>
                <p className="text-sm text-gray-600 mb-4 italic">
                  💡 AI-Powered Analysis based on 10+ years of real estate expertise & market data
                </p>
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {aiResponse}
                </div>
              </div>
              
              <button
                onClick={() => setStep('lead')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all"
              >
                Talk to Our Sales Team
              </button>
            </div>
          )}

          {step === 'lead' && (
            <form onSubmit={handleLeadSubmit}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="mb-4">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={leadData.name}
                  onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={leadData.email}
                  onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <div className="mb-6">
                <input
                  type="tel"
                  required
                  placeholder="Phone"
                  value={leadData.phone}
                  onChange={(e) => setLeadData({ ...leadData, phone: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg"
              >
                Submit
              </button>
            </form>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
              <p className="text-gray-600 mb-6">Our team will contact you soon.</p>
              <Link
                to="/advisory"
                className="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded-lg"
              >
                Get More Advice
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvisoryChat;
