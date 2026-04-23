import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Component that automatically translates text based on selected language
 * Usage: <TranslatedText>Hello World</TranslatedText>
 */
const TranslatedText = ({ children, as: Component = 'span', className = '', ...props }) => {
  const { language, translate } = useLanguage();
  const [translatedText, setTranslatedText] = useState(children);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (language === 'en' || !children || typeof children !== 'string') {
      setTranslatedText(children);
      return;
    }

    const translateText = async () => {
      setIsTranslating(true);
      try {
        const result = await translate(children);
        setTranslatedText(result);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(children); // Fallback to original
      } finally {
        setIsTranslating(false);
      }
    };

    translateText();
  }, [children, language, translate]);

  return (
    <Component className={className} {...props}>
      {isTranslating ? children : translatedText}
    </Component>
  );
};

export default TranslatedText;
