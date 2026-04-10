import type { Metadata } from 'next';
import BlogArticlePage from '@/components/public/BlogArticlePage';

export const metadata: Metadata = {
  title: 'Kuka hoitaa lemmikin lomalla? Näin löydät luotettavan ratkaisun | TassuKaveri',
  description:
    'Loman suunnittelu tuo lemmikinomistajalle huolen: kuka hoitaa lemmikin lomalla? Lue parhaat ratkaisut koiran ja kissan hoitoon matkustamisen aikana.',
  alternates: {
    canonical: 'https://tassukaveri.fi/blog/kuka-hoitaa-lemmikin-lomalla.html',
  },
};

export default function KukaHoitaaLemmikinLomallaPage() {
  return <BlogArticlePage slug="kuka-hoitaa-lemmikin-lomalla.html" />;
}
