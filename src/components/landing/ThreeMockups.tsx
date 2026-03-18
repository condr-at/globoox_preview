'use client';

import { useState, useCallback } from 'react';
import { MyBooksMockup } from './MyBooksMockup';
import { ReaderMockup } from './ReaderMockup';
import { EnjoyMockup } from './EnjoyMockup';

interface ThreeMockupsProps {
  label?: string;
  heading?: string;
}

const steps = [
  { step: 'Step 1', description: 'Upload your ebook' },
  { step: 'Step 2', description: 'Choose your language' },
  { step: 'Step 3', description: 'Enjoy your book!' },
];

export function ThreeMockups({ label = 'How It Works', heading = 'Three simple steps.' }: ThreeMockupsProps) {
  const [active, setActive] = useState(0);

  const handleCycleEnd = useCallback(() => {
    setActive(prev => (prev + 1) % 3);
  }, []);

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

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0',
        }}>
        {/* Left monogram */}
        <img
          src="/images/monogram.svg"
          alt=""
          aria-hidden="true"
          className="threemockups-monogram"
          style={{ height: '382px', flexShrink: 0, opacity: 0.55, marginRight: '48px' }}
        />
        <div className="threemockups-card" style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.03)',
          padding: '48px',
          display: 'inline-flex',
        }}>
        <div className="threemockups-layout" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '64px',
        }}>
          {/* Mockup */}
          <div className="threemockups-mockup" style={{ flexShrink: 0, width: '320px' }}>
            {active === 0 && <MyBooksMockup onCycleEnd={handleCycleEnd} />}
            {active === 1 && <ReaderMockup onCycleEnd={handleCycleEnd} />}
            {active === 2 && <EnjoyMockup onCycleEnd={handleCycleEnd} />}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {steps.map(({ step, description }, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '24px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  backgroundColor: active === i ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderLeft: active === i ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'background-color 0.25s ease',
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--dusk)',
                  transition: 'color 0.25s ease',
                }}>
                  {step}
                </span>
                <span className="threemockups-tab-label" style={{
                  fontSize: '22px',
                  fontFamily: 'Lora, serif',
                  color: active === i ? 'var(--parchment)' : 'rgba(244,240,232,0.4)',
                  transition: 'color 0.25s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {description}
                </span>
              </button>
            ))}
          </div>{/* /tabs */}
        </div>{/* /layout */}
        </div>{/* /card */}
        {/* Right monogram (mirrored) */}
        <img
          src="/images/monogram.svg"
          alt=""
          aria-hidden="true"
          className="threemockups-monogram"
          style={{ height: '382px', flexShrink: 0, opacity: 0.55, marginLeft: '48px', transform: 'scaleX(-1)' }}
        />
      </div>{/* /centering flex */}
      </div>{/* /container */}
      <style>{`
        @media (max-width: 639px) {
          .threemockups-monogram { display: none !important; }
          .threemockups-section { padding: 60px 0 !important; }
          .threemockups-container { padding: 0 20px !important; }
          .threemockups-heading { font-size: 28px !important; }
          .threemockups-layout { flex-direction: column !important; gap: 40px !important; }
          .threemockups-mockup { width: 100% !important; }
          .threemockups-tab-label { white-space: normal !important; }
          .threemockups-card { border: none !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .threemockups-monogram { display: none !important; }
          .threemockups-card { border: none !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; }
          .threemockups-heading { font-size: 36px !important; }
          .threemockups-layout { gap: 32px !important; }
        }
      `}</style>
    </section>
  );
}
