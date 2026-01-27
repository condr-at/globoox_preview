import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};
import './globals.css';
import Header from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'Globoox Preview',
  description: 'Read classic literature in English, French, Spanish, and German with instant translations.',
  keywords: ['reading', 'books', 'translation', 'language learning', 'ebooks'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Globoox',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Globoox Preview',
    description: 'Read classic literature with instant translations',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[var(--bg-grouped)]">
        <div className="min-h-screen">
          <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>
        <Header />
      </body>
    </html>
  );
}
