import { SectionLabel } from './SectionLabel';
import { CompareSlider } from './CompareSlider';

export function FeaturesGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '24px',
        margin: '100px 0',
      }}
    >
      {/* The Method - small card (5 columns) */}
      <div
        style={{
          gridColumn: 'span 5',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <SectionLabel>The Method</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              marginBottom: '16px',
              color: '#1A1F2B',
            }}
          >
            Seamless by design.
          </h2>
          <ol style={{ margin: '24px 0 0 20px', color: '#5E6771' }}>
            <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Upload your manuscript</li>
            <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Select your destination language</li>
            <li style={{ marginBottom: '12px', paddingLeft: '8px' }}>Begin your literary journey</li>
          </ol>
        </div>
      </div>

      {/* Advanced Engine - large dark card (7 columns) */}
      <div
        style={{
          gridColumn: 'span 7',
          background: '#1A1F2B',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <SectionLabel style={{ color: '#D48B77' }}>Advanced Engine</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              marginBottom: '16px',
              color: 'white',
            }}
          >
            Thought-for-thought translation.
          </h2>
          <p style={{ color: '#A0A9B5', fontSize: '17px' }}>
            We move beyond literal substitution. Our engine preserves the author&apos;s voice, cultural idioms, and the
            emotional resonance of every passage.
          </p>
        </div>
      </div>

      {/* Quality Assurance - full width (12 columns) */}
      <div
        style={{
          gridColumn: 'span 12',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
          <SectionLabel>Quality Assurance</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              marginBottom: '16px',
              color: '#1A1F2B',
            }}
          >
            Preserving the narrative.
          </h2>
          <p style={{ color: '#5E6771', fontSize: '17px' }}>
            Experience the fidelity of our translations compared to original texts. Drag the slider to compare.
          </p>
        </div>
        <CompareSlider />
      </div>

      {/* Privacy First - large card (7 columns) */}
      <div
        style={{
          gridColumn: 'span 7',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <SectionLabel>Privacy First</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              marginBottom: '16px',
              color: '#1A1F2B',
            }}
          >
            Your library, kept private.
          </h2>
          <p style={{ color: '#5E6771', fontSize: '17px' }}>
            We respect the sanctity of your personal collection. Files are processed securely, encrypted at rest, and
            never stored beyond the translation window.
          </p>
        </div>
      </div>

      {/* Premium Access - small card (5 columns) */}
      <div
        style={{
          gridColumn: 'span 5',
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          textAlign: 'center',
          borderColor: '#B25032',
        }}
      >
        <div>
          <SectionLabel>Premium Access</SectionLabel>
          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 400,
              letterSpacing: '-0.01em',
              fontSize: '32px',
              marginBottom: '16px',
              color: '#1A1F2B',
            }}
          >
            Simple pricing.
          </h2>
          <div
            style={{
              fontFamily: "'Lora', serif",
              fontSize: '56px',
              fontWeight: '700',
              margin: '16px 0',
              color: '#1A1F2B',
            }}
          >
            $4.99
            <span style={{ fontSize: '18px', color: '#5E6771', fontWeight: '400' }}> / month</span>
          </div>
          <p style={{ fontSize: '15px', color: '#5E6771' }}>
            Includes unlimited translations and cloud sync across all your reading devices.
          </p>
        </div>
      </div>
    </div>
  );
}
