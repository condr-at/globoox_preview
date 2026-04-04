import type { Metadata } from 'next';
import { createProductPageTitle, createSharedPreviewMetadata } from '@/lib/shareMetadata';

export const metadata: Metadata = {
  title: createProductPageTitle('My Books'),
  description:
    'Your Globoox library. Keep your translated EPUBs, sync reading progress, and continue reading across devices.',
  alternates: {
    canonical: '/my-books',
  },
  ...createSharedPreviewMetadata('/my-books'),
};

export default function MyBooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}