'use client';

import { MyBooksMockup } from './MyBooksMockup';
import { ReaderMockup } from './ReaderMockup';
import { EnjoyMockup } from './EnjoyMockup';

interface ThreeMockupsProps {
  label?: string;
  heading?: string;
}

const steps = [
  { step: 'Step 1', description: 'Upload your ebook', mockup: <MyBooksMockup /> },
  { step: 'Step 2', description: 'Choose your language', mockup: <ReaderMockup /> },
  { step: 'Step 3', description: 'Enjoy your book!', mockup: <EnjoyMockup /> },
];

export function ThreeMockups({ label = 'How It Works', heading = 'Three simple steps.' }: ThreeMockupsProps) {
  return (
    <section className="threemockups-section" style={{ padding: '120px 0', background: 'var(--ink)' }}>
      <div className="threemockups-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>

        <div style={{ marginBottom: '80px', textAlign: 'center' }}>
          <span style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--dusk)',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}>
            {label}
          </span>
          <h2 className="threemockups-heading" style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: 'var(--parchment)',
            margin: 0,
          }}>
            {heading}
          </h2>
        </div>

        <div className="threemockups-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '48px',
          alignItems: 'start',
        }}>
          {steps.map(({ step, description, mockup }) => (
            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                {mockup}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--dusk)',
                  marginBottom: '8px',
                }}>
                  {step}
                </div>
                <div style={{
                  fontSize: '18px',
                  color: 'var(--parchment)',
                  fontFamily: 'Lora, serif',
                }}>
                  {description}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      <style>{`
        @media (max-width: 639px) {
          .threemockups-section { padding: 60px 0 !important; }
          .threemockups-container { padding: 0 20px !important; }
          .threemockups-heading { font-size: 28px !important; }
          .threemockups-grid { grid-template-columns: 1fr !important; gap: 64px !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .threemockups-heading { font-size: 36px !important; }
          .threemockups-grid { grid-template-columns: 1fr !important; gap: 64px !important; }
        }
      `}</style>
    </section>
  );
}
