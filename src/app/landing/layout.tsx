import { ReactNode } from 'react';
import type { Metadata } from 'next';
import './landing.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export const metadata: Metadata = {
  title: 'Globoox — A Global Ebookstore Where Every Book Exists in Your Language',
  description:
    'Instantly translate any EPUB ebook into English, French, Spanish, German, or Russian. AI-powered translations that capture the author\'s true intent. Upload and start reading for free.',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: 'Globoox — Read Any Book in Your Language',
    description:
      'AI-powered ebook translation. Upload an EPUB and read it in your native language with nuance and depth.',
    url: `${SITE_URL}/landing`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Globoox — Read Any Book in Your Language',
    description:
      'AI-powered ebook translation. Upload an EPUB and read it in your native language.',
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
    'Reading app that instantly translates ebooks into your native language with AI. Supports English, French, Spanish, German, and Russian.',
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
