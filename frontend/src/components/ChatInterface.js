import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import VoiceInput from './VoiceInput';
import LocationPicker from './LocationPicker';
import PhotoUploader from './PhotoUploader';
import { useLanguage } from '../i18n/translations';
import { formatLandArea, formatPlotArea, formatBuiltUpArea, getUnitsForPropertyType } from '../utils/unitConverter';
import './ChatInterface.css';

const ChatInterface = ({ propertyType, transactionType, onComplete, onCancel }) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [propertyData, setPropertyData] = useState({
    property_type: propertyType,
    transaction_type: transactionType,
    location: null,
    area: {},
    price: {},
    details: {},
    photos: [],
    owner_contact: {}
  });
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const conversationFlow = [
    {
      id: 'welcome',
      bot: t('whereLocation'),
      type: 'location',
      field: 'location'
    },
    {
      id: 'area',
      bot: t('howMuchArea'),
      type: propertyType === 'lands' || propertyType === 'farmLands' ? 'land_area' : 'number_area',
      field: 'area'
    },
    {
      id: 'price',
      bot: t('whatPrice'),
      type: 'price',
      field: 'price'
    },
    {
      id: 'negotiable',
      bot: t('negotiable'),
      type: 'choice',
      options: [
        { label: t('yes') + ' - 2%', value: { negotiable: true, margin: '2%' } },
        { label: t('yes') + ' - 5%', value: { negotiable: true, margin: '5%' } },
        { label: t('no'), value: { negotiable: false, margin: 'fixed' } }
      ],
      field: 'price'
    },
    {
      id: 'facing',
      bot: t('facing'),
      type: 'choice',
      options: [
        { label: t('east'), value: 'East' },
        { label: t('west'), value: 'West' },
        { label: t('north'), value: 'North' },
        { label: t('south'), value: 'South' }
      ],
      field: 'details.facing'
    },
    {
      id: 'additional_info',
      bot: t('additionalInfo'),
      type: 'text',
      field: 'details.additional_info',
      placeholder: t('additionalInfoPlaceholder'),
      optional: true
    },
    {
      id: 'photos',
      bot: t('addPhotos'),
      type: 'photos',
      field: 'photos'
    },
    {
      id: 'owner',
      bot: t('ownerDetails') + '\n' + t('ownerPrivacy'),
      type: 'owner_contact',
      field: 'owner_contact'
    }
  ];

  useEffect(() => {
    // Start conversation
    addBotMessage(conversationFlow[0].bot);
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { type: 'bot', text, timestamp: new Date() }]);
  };

  const addUserMessage = (text, data = null) => {
    setMessages(prev => [...prev, { type: 'user', text, data, timestamp: new Date() }]);
  };

  const handleLocationSelect = (location) => {
    setPropertyData(prev => ({ ...prev, location }));
    addUserMessage(location.address, location);
    proceedToNextStep();
  };

  const handleAreaInput = (areaData) => {
    setPropertyData(prev => ({ ...prev, area: areaData }));
    
    let displayText = '';
    if (propertyType === 'lands' || propertyType === 'farmLands') {
      const formatted = formatLandArea(areaData.acres || 0, areaData.guntas || 0);
      displayText = formatted.display + '\n' + formatted.readable;
    } else {
      const formatted = formatPlotArea(areaData.value, areaData.unit);
      displayText = formatted.display + '\n' + formatted.readable;
    }
    
    addUserMessage(displayText, areaData);
    proceedToNextStep();
  };

  const handlePriceInput = (price) => {
    setPropertyData(prev => ({ ...prev, price: { ...prev.price, amount: price } }));
    addUserMessage(`₹${(price / 100000).toFixed(2)} Lakhs`, price);
    proceedToNextStep();
  };

  const handleChoice = (option) => {
    const step = conversationFlow[currentStep];
    const field = step.field;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPropertyData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: option.value }
      }));
    } else {
      setPropertyData(prev => ({ ...prev, [field]: { ...prev[field], ...option.value } }));
    }
    
    addUserMessage(option.label, option.value);
    proceedToNextStep();
  };

  const handlePhotosChange = (photos) => {
    setPropertyData(prev => ({ ...prev, photos: photos.map(p => p.preview) }));
  };

  const handlePhotosContinue = () => {
    addUserMessage(`${propertyData.photos.length} photos added`);
    proceedToNextStep();
  };

  const handleTextInput = (text) => {
    const step = conversationFlow[currentStep];
    const field = step.field;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPropertyData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: text }
      }));
    } else {
      setPropertyData(prev => ({ ...prev, [field]: text }));
    }
    
    addUserMessage(text || 'Skipped', text);
    setInputValue('');
    proceedToNextStep();
  };

  const handleOwnerContact = (contact) => {
    setPropertyData(prev => ({ ...prev, owner_contact: contact }));
    addUserMessage(contact.name ? `Owner: ${contact.name}` : 'Skipped');
    completeConversation();
  };

  const proceedToNextStep = () => {
    const nextStep = currentStep + 1;
    if (nextStep < conversationFlow.length) {
      setCurrentStep(nextStep);
      setTimeout(() => {
        addBotMessage(conversationFlow[nextStep].bot);
      }, 500);
    }
  };

  const completeConversation = () => {
    addBotMessage(t('propertyAdded'));
    setTimeout(() => {
      onComplete(propertyData);
    }, 2000);
  };

  const handleVoiceTranscript = (transcript) => {
    setInputValue(transcript);
  };

  const renderInputForStep = () => {
    const step = conversationFlow[currentStep];
    
    if (!step) return null;

    switch (step.type) {
      case 'location':
        return (
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            initialLocation={propertyData.location}
          />
        );
      
      case 'land_area':
        return (
          <div className="area-input-container">
            <div className="land-area-inputs">
              <div className="input-group">
                <label>{t('acres')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="area-input"
                  onChange={(e) => setPropertyData(prev => ({
                    ...prev,
                    area: { ...prev.area, acres: parseFloat(e.target.value) || 0 }
                  }))}
                />
              </div>
              <div className="input-group">
                <label>{t('guntas')} *</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  placeholder="10"
                  className="area-input"
                  required
                  onChange={(e) => setPropertyData(prev => ({
                    ...prev,
                    area: { ...prev.area, guntas: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>
            </div>
            <button
              className="continue-btn"
              onClick={() => handleAreaInput({
                acres: propertyData.area.acres || 0,
                guntas: propertyData.area.guntas,
                total_sqft: ((propertyData.area.acres || 0) * 43560) + ((propertyData.area.guntas || 0) * 1089)
              })}
              disabled={!propertyData.area.guntas}
            >
              {t('next')} →
            </button>
          </div>
        );
      
      case 'number_area':
        return (
          <div className="area-input-container">
            <div className="input-group">
              <input
                type="number"
                placeholder="500"
                className="area-input"
                onChange={(e) => setInputValue(e.target.value)}
              />
              <select
                className="unit-select"
                onChange={(e) => setPropertyData(prev => ({
                  ...prev,
                  area: { ...prev.area, unit: e.target.value }
                }))}
              >
                <option value="squareYards">{t('squareYards')}</option>
                <option value="squareFeet">{t('squareFeet')}</option>
                <option value="squareMeters">{t('squareMeters')}</option>
              </select>
            </div>
            <button
              className="continue-btn"
              onClick={() => handleAreaInput({
                value: parseFloat(inputValue),
                unit: propertyData.area.unit || 'squareYards',
                total_sqft: parseFloat(inputValue) * (propertyData.area.unit === 'squareYards' ? 9 : 1)
              })}
              disabled={!inputValue}
            >
              {t('next')} →
            </button>
          </div>
        );
      
      case 'price':
        return (
          <div className="price-input-container">
            <div className="input-with-voice">
              <input
                type="number"
                placeholder="5000000"
                className="price-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <VoiceInput
                language={language}
                onTranscript={handleVoiceTranscript}
              />
            </div>
            <div className="price-helper">
              {inputValue && `₹${(parseFloat(inputValue) / 100000).toFixed(2)} Lakhs`}
            </div>
            <button
              className="continue-btn"
              onClick={() => handlePriceInput(parseFloat(inputValue))}
              disabled={!inputValue}
            >
              {t('next')} →
            </button>
          </div>
        );
      
      case 'choice':
        return (
          <div className="choice-buttons">
            {step.options.map((option, index) => (
              <button
                key={index}
                className="choice-btn"
                onClick={() => handleChoice(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      
      case 'photos':
        return (
          <div className="photos-container">
            <PhotoUploader
              onPhotosChange={handlePhotosChange}
              maxPhotos={10}
            />
            <button
              className="continue-btn"
              onClick={handlePhotosContinue}
            >
              {t('next')} →
            </button>
          </div>
        );
      
      case 'text':
        return (
          <div className="text-input-container">
            <textarea
              placeholder={step.placeholder || t('typeOrSpeak')}
              className="text-area-input"
              rows="4"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <div className="button-group">
              {step.optional && (
                <button
                  className="skip-btn"
                  onClick={() => {
                    addUserMessage(t('skip'));
                    handleTextInput('');
                  }}
                >
                  {t('skip')}
                </button>
              )}
              <button
                className="continue-btn"
                onClick={() => handleTextInput(inputValue)}
                disabled={!step.optional && !inputValue.trim()}
              >
                {t('next')} →
              </button>
            </div>
          </div>
        );
      
      case 'owner_contact':
        return (
          <div className="owner-contact-container">
            <input
              type="text"
              placeholder={t('ownerName')}
              className="text-input"
              onChange={(e) => setPropertyData(prev => ({
                ...prev,
                owner_contact: { ...prev.owner_contact, name: e.target.value }
              }))}
            />
            <input
              type="tel"
              placeholder={t('ownerPhone')}
              className="text-input"
              onChange={(e) => setPropertyData(prev => ({
                ...prev,
                owner_contact: { ...prev.owner_contact, phone: e.target.value }
              }))}
            />
            <div className="button-group">
              <button
                className="skip-btn"
                onClick={() => handleOwnerContact({})}
              >
                {t('skip')}
              </button>
              <button
                className="continue-btn"
                onClick={() => handleOwnerContact(propertyData.owner_contact)}
              >
                {t('done')} ✓
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <button className="back-btn" onClick={onCancel}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-title">
          {t('add')} {t(propertyType)}
        </div>
        <div className="progress-indicator">
          {currentStep + 1} / {conversationFlow.length}
        </div>
      </div>

      <div className="chat-messages" ref={chatContainerRef}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.type}`}
          >
            <div className="message-bubble">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {renderInputForStep()}
      </div>
    </div>
  );
};

export default ChatInterface;
