import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(false);

  // Get language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage && ['en', 'te', 'hi'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference
  const changeLanguage = (newLanguage) => {
    if (['en', 'te', 'hi'].includes(newLanguage)) {
      setLanguage(newLanguage);
      localStorage.setItem('preferredLanguage', newLanguage);
      setTranslations({}); // Clear cached translations
    }
  };

  // Translate a single text
  const translate = async (text) => {
    // If English or text is empty, return as-is
    if (language === 'en' || !text) {
      return text;
    }

    // Check if already translated
    const cacheKey = `${text}_${language}`;
    if (translations[cacheKey]) {
      return translations[cacheKey];
    }

    try {
      setLoading(true);
      
      const targetLang = language === 'te' ? 'telugu' : 'hindi';
      
      const response = await fetch(`${BACKEND_URL}/api/translations/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_language: targetLang
        })
      });

      if (!response.ok) {
        console.error('Translation failed:', response.statusText);
        return text;
      }

      const data = await response.json();
      
      // Cache the translation
      setTranslations(prev => ({
        ...prev,
        [cacheKey]: data.translated
      }));

      return data.translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    } finally {
      setLoading(false);
    }
  };

  // Translate multiple texts in batch
  const translateBatch = async (textArray) => {
    // If English, return as-is
    if (language === 'en' || !textArray || textArray.length === 0) {
      return textArray.reduce((acc, text) => ({ ...acc, [text]: text }), {});
    }

    try {
      setLoading(true);
      
      const targetLang = language === 'te' ? 'telugu' : 'hindi';
      
      // Filter out already translated texts
      const textsToTranslate = textArray.filter(text => {
        const cacheKey = `${text}_${language}`;
        return !translations[cacheKey];
      });

      if (textsToTranslate.length === 0) {
        // All texts are cached
        return textArray.reduce((acc, text) => {
          const cacheKey = `${text}_${language}`;
          return { ...acc, [text]: translations[cacheKey] };
        }, {});
      }

      const response = await fetch(`${BACKEND_URL}/api/translations/translate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: textsToTranslate,
          target_language: targetLang
        })
      });

      if (!response.ok) {
        console.error('Batch translation failed:', response.statusText);
        return textArray.reduce((acc, text) => ({ ...acc, [text]: text }), {});
      }

      const data = await response.json();
      
      // Cache all translations
      const newTranslations = { ...translations };
      Object.entries(data.translations).forEach(([original, translated]) => {
        const cacheKey = `${original}_${language}`;
        newTranslations[cacheKey] = translated;
      });
      setTranslations(newTranslations);

      // Return all translations (cached + new)
      return textArray.reduce((acc, text) => {
        const cacheKey = `${text}_${language}`;
        return { ...acc, [text]: newTranslations[cacheKey] || text };
      }, {});
    } catch (error) {
      console.error('Batch translation error:', error);
      return textArray.reduce((acc, text) => ({ ...acc, [text]: text }), {});
    } finally {
      setLoading(false);
    }
  };

  const value = {
    language,
    changeLanguage,
    translate,
    translateBatch,
    loading,
    languages: [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు' },
      { code: 'hi', name: 'Hindi', native: 'हिंदी' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
