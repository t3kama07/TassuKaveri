'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

export type Language = 'en' | 'fi';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (english: string, finnish: string) => string;
};

const STORAGE_KEY = 'tassukaveri-language';
const LANGUAGE_CHANGE_EVENT = 'tassukaveri-language-change';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(
    (onStoreChange) => {
      window.addEventListener('storage', onStoreChange);
      window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener('storage', onStoreChange);
        window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
      };
    },
    () => {
      const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
      return storedLanguage === 'en' ? 'en' : 'fi';
    },
    () => 'fi'
  );

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const t = useCallback(
    (english: string, finnish: string) => (language === 'fi' ? finnish : english),
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
