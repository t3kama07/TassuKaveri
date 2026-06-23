'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';

export type Language = 'en' | 'fi';

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
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
      return storedLanguage === 'fi' ? 'fi' : 'en';
    },
    () => 'en'
  );

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
