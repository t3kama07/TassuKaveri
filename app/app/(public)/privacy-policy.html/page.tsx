import type { Metadata } from 'next';
import LegalPage from '@/components/public/LegalPage';
import { privacyPolicyPageContent } from '@/lib/publicPagesContent';

export const metadata: Metadata = {
  title: 'Privacy Policy | TassuKaveri',
  description:
    'Read how TassuKaveri handles profile information, messages, requests, and community activity on the platform.',
  alternates: {
    canonical: 'https://tassukaveri.fi/privacy-policy.html',
  },
};

export default function PrivacyPolicyHtmlPage() {
  return <LegalPage content={privacyPolicyPageContent} />;
}
