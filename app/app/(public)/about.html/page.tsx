import type { Metadata } from 'next';
import AboutPage from '@/components/public/AboutPage';

export const metadata: Metadata = {
  title: 'About TassuKaveri | Community Pet Care in Finland',
  description:
    'Learn how TassuKaveri brings together trust, credits, and local community to make pet care feel more human across Finland.',
  alternates: {
    canonical: '/about.html',
  },
};

export default function AboutHtmlPage() {
  return <AboutPage />;
}
