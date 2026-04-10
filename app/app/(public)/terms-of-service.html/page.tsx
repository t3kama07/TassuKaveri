import type { Metadata } from 'next';
import LegalPage from '@/components/public/LegalPage';
import { termsOfServicePageContent } from '@/lib/publicPagesContent';

export const metadata: Metadata = {
  title: 'Terms of Service | TassuKaveri',
  description:
    'Read the basic rules for using TassuKaveri, including member responsibilities, credits, exchanges, and community conduct.',
  alternates: {
    canonical: 'https://tassukaveri.fi/terms-of-service.html',
  },
};

export default function TermsOfServiceHtmlPage() {
  return <LegalPage content={termsOfServicePageContent} />;
}
