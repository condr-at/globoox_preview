import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/ui/Header';
import { ThemeProvider } from '@/components/theme-provider';
import AmplitudeProvider from '@/components/AmplitudeProvider';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Globoox Preview',
  description: 'Reading app that translates any book with AI',
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
    description: 'Reading app that translates any book with AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdn.amplitude.com/script/c84d6c37391e0d05ecca9779feeecba6.js"
          strategy="beforeInteractive"
        />
        <Script id="amplitude-init" strategy="beforeInteractive">
          {`window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));window.amplitude.init('c84d6c37391e0d05ecca9779feeecba6', {"fetchRemoteConfig":true,"autocapture":{"attribution":true,"fileDownloads":true,"formInteractions":true,"pageViews":true,"sessions":true,"elementInteractions":true,"networkTracking":true,"webVitals":true,"frustrationInteractions":{"thrashedCursor":true,"errorClicks":true,"deadClicks":true,"rageClicks":true}}});`}
        </Script>
      </head>
      <body className="antialiased bg-[var(--bg-grouped)]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AmplitudeProvider />
          <div className="min-h-screen">
            <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
              {children}
            </main>
          </div>
          <Header />
        </ThemeProvider>
      </body>
    </html>
  );
}
