import { CompareSlider } from './CompareSlider';

export function QualityAssuranceV2() {
  return (
    <section style={{ padding: '120px 0' }}>
      <div style={{ marginBottom: '80px', textAlign: 'center' }}>
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 600,
            color: '#B25032',
            letterSpacing: '0.12em',
            marginBottom: '16px',
            display: 'block',
          }}
        >
          Quality Assurance
        </span>
        <h2
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: '#1A1F2B',
            marginBottom: '24px',
            margin: '0 auto 24px',
            maxWidth: '600px',
          }}
        >
          Every Translation is Vetted
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: '#666',
            maxWidth: '600px',
            lineHeight: 1.6,
            margin: '0 auto',
          }}
        >
          Our multi-layer quality system ensures translations preserve literary nuance while maintaining readability in your language.
        </p>
      </div>

      <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
          {/* MacBook lid */}
          <div
            style={{
              width: '100%',
              aspectRatio: '520 / 340',
              background: '#C8C4BC',
              borderRadius: '16px 16px 4px 4px',
              padding: '1.5%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
          >
            {/* Screen */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: '#1A1F2B',
                borderRadius: '10px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* CompareSlider stretched to fill screen */}
              <div className="macbook-screen-slider" style={{ width: '100%', height: '100%' }}>
                <CompareSlider />
                <style>{`
                  .macbook-screen-slider > div { margin-top: 0 !important; height: 100% !important; }
                  .macbook-screen-slider > div > div { height: 100% !important; border-radius: 0 !important; border: none !important; }
                `}</style>
              </div>
            </div>
          </div>
          {/* MacBook base */}
          <div
            style={{
              width: 'calc(100% + 60px)',
              height: '18px',
              background: '#B8B4AC',
              marginLeft: '-30px',
              borderRadius: '2px 2px 12px 12px',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
