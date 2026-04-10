import type { Metadata } from 'next';
import BlogArticlePage from '@/components/public/BlogArticlePage';

export const metadata: Metadata = {
  title: 'Lemmikinhoito Oulussa – parhaat vaihtoehdot lemmikinomistajille | TassuKaveri',
  description:
    'Etsitkö lemmikinhoitoa Oulussa? Lue parhaat vaihtoehdot koiran ja kissan hoitoon Oulussa sekä yhteisölliset ratkaisut.',
  alternates: {
    canonical: 'https://tassukaveri.fi/blog/lemmikinhoito-oulussa.html',
  },
};

export default function LemmikinhoitoOulussaPage() {
  return <BlogArticlePage slug="lemmikinhoito-oulussa.html" />;
}
