import type { Metadata } from 'next';
import ContactPage from '@/components/public/ContactPage';

export const metadata: Metadata = {
  title: 'Contact TassuKaveri | Pet Care Support',
  description:
    'Contact TassuKaveri for questions about pet care, credits, sitter profiles, partnerships, and community support.',
  alternates: {
    canonical: '/contact.html',
  },
};

export default function ContactHtmlPage() {
  return <ContactPage />;
}
