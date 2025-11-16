import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { en } from '../i18n/en';
import { es } from '../i18n/es';

type Language = 'en' | 'es';

type Translations = typeof en;

const translations: Record<Language, Translations> = { en, es };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getNestedTranslation = (language: Language, key: string): string => {
  const langObject = translations[language];
  return key.split('.').reduce((obj: any, k: string) => {
    return obj?.[k];
  }, langObject) || key;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('formbot-language');
    if (storedLang === 'en' || storedLang === 'es') {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('formbot-language', lang);
    setLanguageState(lang);
  };

  const t = useCallback((key: string, replacements: Record<string, string> = {}): string => {
    let translation = getNestedTranslation(language, key);
    Object.keys(replacements).forEach(placeholder => {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
