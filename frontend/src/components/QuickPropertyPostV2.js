import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MapPin, Check } from 'lucide-react';
import { 
  getEnabledPropertyTypes, 
  NEGOTIABLE_OPTIONS, 
  FACING_OPTIONS,
  BHK_OPTIONS,
  getUnitsForPropertyType,
  COLORS 
} from '../config/propertyConfig';
import './QuickPropertyPostV2.css';

const QuickPropertyPostV2 = ({ onComplete, onCancel }) => {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [propertyData, setPropertyData] = useState({
    type: null,
    cost: { amount: null, unit: 'lakhs' },
    size: { value: null, unit: null },
    negotiable: null,
    facing: null,
    location: null
  });
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);

  const propertyTypes = getEnabledPropertyTypes();

  // Dynamic flow generation based on property type
  const generateFlow = (propertyType) => {
    const baseFlow = [
      {
        id: 'type',
        bot: '🏠 What type of property do you want to sell?',
        type: 'icon-grid',
        options: propertyTypes
      }
    ];

    if (!propertyType) return baseFlow;

    const typeConfig = propertyTypes.find(t => t.id === propertyType);
    if (!typeConfig) return baseFlow;

    const dynamicSteps = [];

    // Add BHK selection for Flat, Independent House, Villa
    if (['flat', 'independent_house', 'villa'].includes(propertyType)) {
      dynamicSteps.push({
        id: 'bhk',
        bot: '🛏️ How many bedrooms?',
        type: 'icon-buttons',
        options: BHK_OPTIONS
      });
    }

    // Always add cost
    dynamicSteps.push({
      id: 'cost',
      bot: '💰 What is the total cost?',
      type: 'cost-mobile'
    });

    // Always add size with property-specific units
    dynamicSteps.push({
      id: 'size',
      bot: '📏 What is the property size?',
      type: 'size-mobile',
      units: typeConfig.units,
      defaultUnit: typeConfig.defaultUnit
    });

    // Always add negotiable
    dynamicSteps.push({
      id: 'negotiable',
      bot: '🤝 Is the price negotiable?',
      type: 'icon-buttons',
      options: NEGOTIABLE_OPTIONS
    });

    // Add facing (relevant for most types)
    if (['land', 'plot', 'flat', 'independent_house', 'villa'].includes(propertyType)) {
      dynamicSteps.push({
        id: 'facing',
        bot: '🧭 Which direction does it face?',
        type: 'icon-buttons',
        options: FACING_OPTIONS
      });
    }

    // Always add location
    dynamicSteps.push({
      id: 'location',
      bot: '📍 Share the property location',
      type: 'location-mobile'
    });

    return [...baseFlow, ...dynamicSteps];
  };

  const [quickFlow, setQuickFlow] = useState(generateFlow(null));

  useEffect(() => {
    setTimeout(() => {
      addBotMessage(quickFlow[0].bot);
      setShowOptions(true);
    }, 300);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'bot',
      text,
      timestamp: new Date()
    }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      type: 'user',
      text,
      timestamp: new Date()
    }]);
  };

  const proceedToNextStep = () => {
    const nextStep = currentStep + 1;
    setShowOptions(false);
    
    if (nextStep < quickFlow.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        addBotMessage(quickFlow[nextStep].bot);
        setTimeout(() => setShowOptions(true), 300);
      }, 500);
    } else {
      completeQuickPost();
    }
  };

  const completeQuickPost = () => {
    onComplete(propertyData);
  };

  const handleIconSelection = (option) => {
    const step = quickFlow[currentStep];
    
    if (step.id === 'type') {
      setPropertyData(prev => ({
        ...prev,
        type: option.id,
        size: { ...prev.size, unit: option.defaultUnit }
      }));
      addUserMessage(`${option.icon} ${option.label}`);
      
      // Regenerate flow based on selected type
      const newFlow = generateFlow(option.id);
      setQuickFlow(newFlow);
      
      setShowOptions(false);
      proceedToNextStep();
    } else if (step.id === 'bhk') {
      setPropertyData(prev => ({ ...prev, bhk: option.value }));
      addUserMessage(`${option.icon} ${option.label}`);
      setShowOptions(false);
      proceedToNextStep();
    } else if (step.id === 'negotiable') {
      setPropertyData(prev => ({ ...prev, negotiable: option.value }));
      addUserMessage(`${option.icon} ${option.label}`);
      setShowOptions(false);
      proceedToNextStep();
    } else if (step.id === 'facing') {
      setPropertyData(prev => ({ ...prev, facing: option.value }));
      addUserMessage(`${option.icon} ${option.label}`);
      setShowOptions(false);
      proceedToNextStep();
    }
  };

  const handleCostSubmit = () => {
    if (!inputValue) return;
    
    const amount = parseFloat(inputValue);
    setPropertyData(prev => ({
      ...prev,
      cost: { ...prev.cost, amount }
    }));
    
    addUserMessage(`₹${amount} ${propertyData.cost.unit}`);
    setInputValue('');
    setShowOptions(false);
    proceedToNextStep();
  };

  const handleSizeSubmit = () => {
    if (!inputValue) return;
    
    const value = parseFloat(inputValue);
    setPropertyData(prev => ({
      ...prev,
      size: { ...prev.size, value }
    }));
    
    addUserMessage(`${value} ${propertyData.size.unit}`);
    setInputValue('');
    setShowOptions(false);
    proceedToNextStep();
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      addBotMessage('📍 Getting your location...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`
          };
          
          setPropertyData(prev => ({ ...prev, location }));
          addUserMessage(`📍 Location shared`);
          setShowOptions(false);
          
          setTimeout(() => {
            completeQuickPost();
          }, 500);
        },
        (error) => {
          addBotMessage('⚠️ Could not get location. You can add it later.');
          const defaultLocation = {
            latitude: null,
            longitude: null,
            address: 'To be added later'
          };
          setPropertyData(prev => ({ ...prev, location: defaultLocation }));
          addUserMessage('Will add location later');
          setShowOptions(false);
          
          setTimeout(() => {
            completeQuickPost();
          }, 500);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const renderInput = () => {
    if (!showOptions) return null;
    
    const step = quickFlow[currentStep];

    switch (step.type) {
      case 'icon-grid':
        return (
          <div className="icon-grid-container">
            {step.options.map((option) => (
              <button
                key={option.id}
                className="icon-grid-item"
                onClick={() => handleIconSelection(option)}
              >
                <div className="icon-large">{option.icon}</div>
                <div className="icon-label">{option.label}</div>
              </button>
            ))}
          </div>
        );

      case 'icon-buttons':
        return (
          <div className="icon-buttons-container">
            {step.options.map((option) => (
              <button
                key={option.id}
                className="icon-button"
                onClick={() => handleIconSelection(option)}
              >
                <span className="icon-emoji">{option.icon}</span>
                <span className="icon-text">{option.label}</span>
              </button>
            ))}
          </div>
        );

      case 'cost-mobile':
        return (
          <div className="mobile-input-container">
            <div className="amount-input-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                type="number"
                placeholder="Enter amount"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="mobile-number-input"
                autoFocus
              />
            </div>
            <div className="unit-chips">
              {['thousands', 'lakhs', 'crores'].map(unit => (
                <button
                  key={unit}
                  className={`unit-chip ${propertyData.cost.unit === unit ? 'active' : ''}`}
                  onClick={() => setPropertyData(prev => ({
                    ...prev,
                    cost: { ...prev.cost, unit }
                  }))}
                >
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="mobile-submit-btn"
              onClick={handleCostSubmit}
              disabled={!inputValue}
            >
              Next <Send size={18} />
            </button>
          </div>
        );

      case 'size-mobile':
        const sizeStep = quickFlow[currentStep];
        const units = sizeStep.units || getUnitsForPropertyType(propertyData.type);
        return (
          <div className="mobile-input-container">
            <div className="amount-input-wrapper">
              <input
                type="number"
                step="0.01"
                placeholder="Enter size"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="mobile-number-input"
                autoFocus
              />
            </div>
            <div className="unit-chips">
              {units.map(unit => (
                <button
                  key={unit}
                  className={`unit-chip ${propertyData.size.unit === unit ? 'active' : ''}`}
                  onClick={() => setPropertyData(prev => ({
                    ...prev,
                    size: { ...prev.size, unit }
                  }))}
                >
                  {unit.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="mobile-submit-btn"
              onClick={handleSizeSubmit}
              disabled={!inputValue}
            >
              Next <Send size={18} />
            </button>
          </div>
        );

      case 'location-mobile':
        return (
          <div className="location-mobile-container">
            <button
              className="location-share-btn-mobile"
              onClick={handleLocationShare}
            >
              <MapPin size={24} />
              <span>Share Live Location</span>
            </button>
            <button
              className="location-skip-btn-mobile"
              onClick={() => {
                const defaultLocation = {
                  latitude: null,
                  longitude: null,
                  address: 'To be added later'
                };
                setPropertyData(prev => ({ ...prev, location: defaultLocation }));
                addUserMessage('Will add location later');
                setShowOptions(false);
                setTimeout(() => completeQuickPost(), 500);
              }}
            >
              Skip for now
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="quick-post-v2">
      {/* Header */}
      <div className="quick-post-v2-header">
        <button className="back-btn-v2" onClick={onCancel}>
          <ArrowLeft size={20} />
        </button>
        <div className="header-title-v2">
          <h2>Quick Post</h2>
          <div className="progress-dots">
            {quickFlow.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${
                  index === currentStep
                    ? 'active'
                    : index < currentStep
                    ? 'completed'
                    : ''
                }`}
              >
                {index < currentStep && <Check size={10} />}
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Messages */}
      <div className="quick-post-v2-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message-v2 ${message.type}`}
          >
            <div className="message-bubble-v2">
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="quick-post-v2-input">
        {renderInput()}
      </div>
    </div>
  );
};

export default QuickPropertyPostV2;