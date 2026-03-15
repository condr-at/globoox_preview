'use client';

import { Hero } from '@/components/landing/Hero';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { QualityAssurance } from '@/components/landing/QualityAssurance';
import { Reviews } from '@/components/landing/Reviews';
import { SectionLabel } from '@/components/landing/SectionLabel';
import { PricingGrid } from '@/components/landing/PricingGrid';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      {/* Hero 1: Centered (intro) */}
      <Hero variant="centered" withBooks={false} />

      {/* Hero 2: Split with books */}
      <Hero variant="split" withBooks={true} />

      {/* Features grid */}
      <FeaturesGrid />

      {/* Quality Assurance section */}
      <QualityAssurance />

      {/* Reviews section */}
      <Reviews />

      {/* Pricing section */}
      <section style={{ padding: '120px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionLabel>Investment in Wisdom</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '48px',
              marginBottom: '20px',
              color: '#1A1F2B',
            }}
          >
            A plan for every reader.
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#5E6771',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            From casual discovery to deep academic research, choose the scale of your literary exploration.
          </p>
        </div>

        <PricingGrid />

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <SectionLabel>Detailed Comparison</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              color: '#1A1F2B',
            }}
          >
            Every nuance compared.
          </h2>
        </div>

        <ComparisonTable />
      </section>

      {/* FAQ section */}
      <FAQ />

      {/* CTA section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </>
  );
}
