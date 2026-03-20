'use client';

import { Hero } from '@/components/landing/Hero';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PrivacyManifest } from '@/components/landing/PrivacyManifest';
import { SupportedLanguages } from '@/components/landing/SupportedLanguages';
import { UsageAnimation } from '@/components/landing/UsageAnimation';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'var(--parchment)', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '160px', background: 'var(--ink)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '92px' }}>
        <LandingHeader
          navItems={[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Quality', href: '#quality' },
            { label: 'Formats & Languages', href: '#formats-languages' },
            { label: 'Start reading', href: '#start' },
          ]}
        />
        <style>{`
          .hero-long-title {
            font-size: 42px !important;
          }
          @media (max-width: 1023px) {
            .hero-long-title {
              font-size: 32px !important;
            }
          }
          @media (max-width: 639px) {
            .hero-long-title {
              font-size: 28px !important;
            }
          }
        `}</style>
        <Hero
          variant="split"
          withBooks={true}
          title="Globoox — reading app that instantly translates e&#8209;books into your native language"
          subtitle=""
          titleClassName="hero-long-title"
        />

        <div id="how-it-works">
          <UsageAnimation />
        </div>

        <div id="quality">
          <QualityAssuranceV2
            label="Translation Quality"
            heading="Translations You Can Trust"
            description="Built on an AI engine fine-tuned by expert linguists, our app delivers clear, accurate, and easy-to-read translations that capture the author's true intent."
          />
        </div>

        <div id="formats-languages">
          <SupportedLanguages />
        </div>

        <div id="privacy">
          <PrivacyManifest />
        </div>

        <div id="start">
          <CTA
            heading="Start with your first book."
            description="Upload your EPUB and enjoy it in your language."
            buttonText="Upload Your First Book"
          />
        </div>

        <Footer
          tagline="We are building a global book platform where any reader can discover, buy, read, and listen to any book in their native language."
        />
      </div>
    </>
  );
}
