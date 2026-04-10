'use client';

import PublicFooter from '@/components/PublicFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { publicContent } from '@/lib/publicContent';

export default function PublicSiteFooter() {
  const { language } = useLanguage();

  return <PublicFooter copy={publicContent[language].landing.footer} />;
}
