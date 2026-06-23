import type { Metadata } from 'next';
import BlogArticlePage from '@/components/public/BlogArticlePage';

export const metadata: Metadata = {
  title: 'Mitä tehdä, kun ei löydy lemmikinhoitajaa? Käytännön ratkaisut | TassuKaveri',
  description:
    'Lemmikinhoitajaa ei löydy? Lue käytännön ratkaisut ja vinkit koiran ja kissan hoitoon kiireellisissä tilanteissa.',
  alternates: {
    canonical: '/blog/ei-loydy-lemmikinhoitajaa.html',
  },
};

export default function EiLoydyLemmikinhoitajaaPage() {
  return <BlogArticlePage slug="ei-loydy-lemmikinhoitajaa.html" />;
}
