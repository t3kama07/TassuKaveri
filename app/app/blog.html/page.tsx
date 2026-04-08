import type { Metadata } from 'next';
import BlogIndexPage from '@/components/public/BlogIndexPage';

export const metadata: Metadata = {
  title: 'Blog | TassuKaveri',
  description:
    'Read TassuKaveri articles about finding pet care, planning around holidays, and building a more local, community-based pet care routine in Finland.',
  alternates: {
    canonical: 'https://tassukaveri.fi/blog.html',
  },
};

export default function BlogHtmlPage() {
  return <BlogIndexPage />;
}
