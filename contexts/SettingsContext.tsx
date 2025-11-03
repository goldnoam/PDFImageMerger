import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { en } from '../locales/en';
import { he } from '../locales/he';

type Theme = 'light' | 'dark';
type Language = 'en' | 'he';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof en) => string;
}

const translations = { en, he };

const getInitialTheme = (): Theme => {
  const storedTheme = localStorage.getItem('theme') as Theme | null;
  if (storedTheme) return storedTheme;
  return 'dark'; // Default to dark theme
}

const getInitialLanguage = (): Language => {
    const storedLang = localStorage.getItem('language') as Language | null;
    if (storedLang) return storedLang;
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'he' ? 'he' : 'en';
}


export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    localStorage.setItem('language', language);
  }, [language]);
  
  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const setLanguage = (newLang: Language) => setLanguageState(newLang);

  const t = useCallback((key: keyof typeof en): string => {
    return translations[language][key] || translations.en[key];
  }, [language]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    language,
    setLanguage,
    t
  }), [theme, language, t]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};