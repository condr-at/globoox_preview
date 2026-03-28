import { ReactNode } from 'react';
import type { Metadata } from 'next';
import './landing.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export const metadata: Metadata = {
  title: 'Globoox',
  description:
    'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: 'Globoox — Read Any Book in Your Language',
    description:
      'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
    url: `${SITE_URL}/landing`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Globoox — Read Any Book in Your Language',
    description:
      'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
  },
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Globoox',
  url: SITE_URL,
  applicationCategory: 'ReadingApplication',
  operatingSystem: 'Any',
  description:
    'Reading app that instantly translates ebooks into your native language with Al. Upload EPUBs and read in English, French, Spanish or Russian',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free to upload and translate your first book',
  },
  featureList: [
    'EPUB ebook upload',
    'AI-powered book translation',
    'English, French, Spanish, German, Russian support',
    'Side-by-side original and translated text',
    'Reading progress sync',
    'Privacy-first: your books stay private',
  ],
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      {children}
    </>
  );
}
