import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';
import './VoiceInput.css';

const VoiceInput = ({ onTranscript, language = 'telugu', placeholder = 'Speak...' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    // Language mapping
    const languageMap = {
      telugu: 'te-IN',
      hindi: 'hi-IN',
      english: 'en-IN'
    };

    recognitionInstance.lang = languageMap[language] || 'te-IN';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setTranscript(currentTranscript);
      
      // If final result, send to parent
      if (event.results[0].isFinal) {
        onTranscript(currentTranscript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [language]);

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript('');
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (error && error.includes('not supported')) {
    return null; // Don't show voice button if not supported
  }

  return (
    <div className="voice-input-container">
      <button
        type="button"
        className={`voice-input-btn ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        disabled={!recognition}
      >
        {isListening ? (
          <>
            <MicOff size={20} />
            <span className="pulse-ring"></span>
          </>
        ) : (
          <Mic size={20} />
        )}
      </button>
      
      {isListening && transcript && (
        <div className="voice-transcript">
          <div className="transcript-text">{transcript}</div>
        </div>
      )}
      
      {error && !error.includes('not supported') && (
        <div className="voice-error">{error}</div>
      )}
    </div>
  );
};

export default VoiceInput;
