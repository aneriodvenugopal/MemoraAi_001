import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n/translations';
import './QuickPropertyPost.css';

const QuickPropertyPost = ({ onComplete, onCancel }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [propertyData, setPropertyData] = useState({
    type: null,
    cost: { amount: null, unit: 'lakhs' },
    size: { value: null, unit: 'acres' },
    negotiable: 'yes',
    location: null
  });
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const quickFlow = [
    {
      id: 'type',
      bot: 'Hello! Want to sell Land or Plot?',
      type: 'choice',
      options: ['Land', 'Plot']
    },
    {
      id: 'cost',
      bot: 'What is the total cost?',
      type: 'cost'
    },
    {
      id: 'size',
      bot: 'Please enter property size',
      type: 'size'
    },
    {
      id: 'negotiable',
      bot: 'Is it negotiable?',
      type: 'choice',
      options: ['Yes', 'No']
    },
    {
      id: 'location',
      bot: 'Choose Location - Share your live location',
      type: 'location'
    }
  ];

  useEffect(() => {
    // Start conversation
    addBotMessage(quickFlow[0].bot);
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
    if (nextStep < quickFlow.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        addBotMessage(quickFlow[nextStep].bot);
      }, 500);
    } else {
      // All questions answered
      completeQuickPost();
    }
  };

  const completeQuickPost = () => {
    onComplete(propertyData);
  };

  const handleChoice = (option) => {
    const step = quickFlow[currentStep];
    
    if (step.id === 'type') {
      setPropertyData(prev => ({ ...prev, type: option.toLowerCase() }));
      addUserMessage(option);
    } else if (step.id === 'negotiable') {
      setPropertyData(prev => ({ ...prev, negotiable: option.toLowerCase() }));
      addUserMessage(option);
    }
    
    proceedToNextStep();
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
          addUserMessage(`📍 Location shared: ${location.address}`);
          
          // Complete after location
          setTimeout(() => {
            completeQuickPost();
          }, 500);
        },
        (error) => {
          console.error('Location error:', error);
          addBotMessage('⚠️ Could not get location. You can add it later.');
          
          // Allow proceeding without location
          const defaultLocation = {
            latitude: null,
            longitude: null,
            address: 'Location not shared'
          };
          setPropertyData(prev => ({ ...prev, location: defaultLocation }));
          addUserMessage('Skipped location');
          
          setTimeout(() => {
            completeQuickPost();
          }, 500);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      // Allow skip
      const defaultLocation = {
        latitude: null,
        longitude: null,
        address: 'Location not available'
      };
      setPropertyData(prev => ({ ...prev, location: defaultLocation }));
      addUserMessage('Location not available');
      
      setTimeout(() => {
        completeQuickPost();
      }, 500);
    }
  };

  const renderInput = () => {
    const step = quickFlow[currentStep];

    switch (step.type) {
      case 'choice':
        return (
          <div className="choice-buttons">
            {step.options.map((option) => (
              <button
                key={option}
                className="choice-btn"
                onClick={() => handleChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'cost':
        return (
          <div className="cost-input-container">
            <div className="cost-input-group">
              <input
                type="number"
                placeholder="Enter amount"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="cost-input"
              />
              <select
                className="unit-select"
                value={propertyData.cost.unit}
                onChange={(e) => setPropertyData(prev => ({
                  ...prev,
                  cost: { ...prev.cost, unit: e.target.value }
                }))}
              >
                <option value="thousands">Thousands</option>
                <option value="lakhs">Lakhs</option>
                <option value="crores">Crores</option>
              </select>
            </div>
            <button
              className="submit-btn"
              onClick={handleCostSubmit}
              disabled={!inputValue}
            >
              <Send size={20} />
            </button>
          </div>
        );

      case 'size':
        return (
          <div className="size-input-container">
            <div className="size-input-group">
              <input
                type="number"
                step="0.01"
                placeholder="Enter size"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="size-input"
              />
              <select
                className="unit-select"
                value={propertyData.size.unit}
                onChange={(e) => setPropertyData(prev => ({
                  ...prev,
                  size: { ...prev.size, unit: e.target.value }
                }))}
              >
                <option value="acres">Acres</option>
                <option value="guntas">Guntas</option>
                <option value="hectares">Hectares</option>
                <option value="cents">Cents</option>
              </select>
            </div>
            <button
              className="submit-btn"
              onClick={handleSizeSubmit}
              disabled={!inputValue}
            >
              <Send size={20} />
            </button>
          </div>
        );

      case 'location':
        return (
          <div className="location-share-container">
            <button
              className="share-location-btn"
              onClick={handleLocationShare}
            >
              <MapPin size={20} />
              <span>Share Live Location</span>
            </button>
            <button
              className="skip-location-btn"
              onClick={() => {
                const defaultLocation = {
                  latitude: null,
                  longitude: null,
                  address: 'To be added later'
                };
                setPropertyData(prev => ({ ...prev, location: defaultLocation }));
                addUserMessage('Will add location later');
                setTimeout(() => {
                  completeQuickPost();
                }, 500);
              }}
            >
              Skip for now
            </button>
            <p className="location-hint">📍 Tap to share your current location</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="quick-property-post">
      {/* Header */}
      <div className="quick-post-header">
        <button className="back-btn" onClick={onCancel}>
          <ArrowLeft size={20} />
        </button>
        <div className="header-title">
          <h2>Quick Property Post</h2>
          <p>Question {currentStep + 1} of {quickFlow.length}</p>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / quickFlow.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="quick-post-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`quick-message ${message.type}`}
          >
            <div className="message-bubble">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="quick-post-input">
        {renderInput()}
      </div>
    </div>
  );
};

export default QuickPropertyPost;
