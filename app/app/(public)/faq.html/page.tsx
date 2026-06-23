import type { Metadata } from 'next';
import FaqPage from '@/components/public/FaqPage';

export const metadata: Metadata = {
  title: 'FAQ | TassuKaveri',
  description:
    'Answers about how TassuKaveri works, how credits are earned, and how the community pet care model fits pet owners in Finland.',
  alternates: {
    canonical: '/faq.html',
  },
};

export default function FaqHtmlPage() {
  return <FaqPage />;
}
