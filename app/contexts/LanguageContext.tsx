'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'fi';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const STORAGE_KEY = 'tassukaveri-language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [hasLoadedStoredLanguage, setHasLoadedStoredLanguage] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);

    if (storedLanguage === 'fi' || storedLanguage === 'en') {
      setLanguage(storedLanguage);
    }

    setHasLoadedStoredLanguage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredLanguage) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [hasLoadedStoredLanguage, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
