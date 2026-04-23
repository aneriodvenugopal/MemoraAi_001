import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSelector = ({ className = '' }) => {
  const { language, changeLanguage, languages } = useLanguage();

  return (
    <div className={`relative ${className}`}>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-cyan-500 cursor-pointer hover:bg-white/20 transition-all"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-blue-900 text-white">
            {lang.native}
          </option>
        ))}
      </select>
      <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
    </div>
  );
};

export default LanguageSelector;
