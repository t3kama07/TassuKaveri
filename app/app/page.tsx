import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Trusted Community Pet Care in Finland | TassuKaveri',
  description:
    'Exchange pet care using credits, not money. Find reliable community-powered pet care across Finland with TassuKaveri.',
};

export default function Home() {
  return <LandingPage />;
}
