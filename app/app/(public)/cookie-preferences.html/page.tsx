import type { Metadata } from 'next';
import CookiePreferencesPage from '@/components/public/CookiePreferencesPage';

export const metadata: Metadata = {
  title: 'Cookie Preferences | TassuKaveri',
  description: 'Manage optional analytics consent for TassuKaveri.',
  alternates: {
    canonical: '/cookie-preferences.html',
  },
};

export default function CookiePreferencesHtmlPage() {
  return <CookiePreferencesPage />;
}
