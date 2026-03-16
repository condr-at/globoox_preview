'use client';

import { Hero } from '@/components/landing/Hero';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { UseCases } from '@/components/landing/UseCases';
import { QualityAssuranceV2 } from '@/components/landing/QualityAssuranceV2';
import { Reviews } from '@/components/landing/Reviews';
import { Pricing } from '@/components/landing/Pricing';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      {/* Hero: Split with books */}
      <Hero variant="split" withBooks={true} />

      {/* Use Cases section */}
      <UseCases />

      {/* Features grid */}
      <FeaturesGrid />

      {/* Quality Assurance section */}
      <QualityAssuranceV2 />

      {/* Reviews section */}
      <Reviews />

      {/* Pricing section */}
      <Pricing />

      {/* FAQ section */}
      <FAQ />

      {/* CTA section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </>
  );
}
