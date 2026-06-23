import type { Metadata } from 'next';
import BlogArticlePage from '@/components/public/BlogArticlePage';

export const metadata: Metadata = {
  title: 'Ilmainen lemmikinhoito – onko se mahdollista? | TassuKaveri',
  description:
    'Onko ilmainen lemmikinhoito mahdollista? Lue realistiset vaihtoehdot ja yhteisölliset ratkaisut lemmikin hoitoon ilman suuria kustannuksia.',
  alternates: {
    canonical: '/blog/ilmainen-lemmikinhoito.html',
  },
};

export default function IlmainenLemmikinhoitoPage() {
  return <BlogArticlePage slug="ilmainen-lemmikinhoito.html" />;
}
