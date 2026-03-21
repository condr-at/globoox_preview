import { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://globoox.co';

export const metadata: Metadata = {
  title: {
    default: 'Globoox — AI-Powered Ebook Translation',
    template: '%s | Globoox',
  },
  description:
    'Reading app that instantly translates ebooks into your native language with AI. Upload EPUBs and read in English, French, Spanish, German, or Russian.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: 'Globoox',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Globoox',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description:
    'A global book platform where any reader can discover, read, and translate any book in their native language.',
  sameAs: [],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
