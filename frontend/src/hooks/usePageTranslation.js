import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Hook to translate page content
 * Provide content object with keys, returns translated versions
 * 
 * Example:
 * const content = usePageTranslation({
 *   title: "Real Estate Management",
 *   subtitle: "Manage properties efficiently"
 * });
 * 
 * Then use: {content.title}, {content.subtitle}
 */
export const usePageTranslation = (contentObj) => {
  const { language, translateBatch } = useLanguage();
  const [translatedContent, setTranslatedContent] = useState(contentObj);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If English, return original content
    if (language === 'en') {
      setTranslatedContent(contentObj);
      return;
    }

    // Translate all content
    const translateContent = async () => {
      setLoading(true);
      try {
        const textsToTranslate = Object.values(contentObj);
        const translations = await translateBatch(textsToTranslate);
        
        // Map translations back to keys
        const translated = {};
        Object.keys(contentObj).forEach(key => {
          translated[key] = translations[contentObj[key]] || contentObj[key];
        });
        
        setTranslatedContent(translated);
      } catch (error) {
        console.error('Page translation error:', error);
        setTranslatedContent(contentObj); // Fallback
      } finally {
        setLoading(false);
      }
    };

    translateContent();
  }, [language]); // Only re-translate when language changes

  return { ...translatedContent, _loading: loading };
};
