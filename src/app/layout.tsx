import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/ui/Header';

export const metadata: Metadata = {
  title: 'LinguaRead - Read in Any Language',
  description: 'Read classic literature in English, French, Spanish, and German with instant translations.',
  keywords: ['reading', 'books', 'translation', 'language learning', 'ebooks'],
  openGraph: {
    title: 'LinguaRead - Read in Any Language',
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
