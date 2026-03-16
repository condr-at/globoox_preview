import { SectionLabel } from './SectionLabel';
import { PricingGrid } from './PricingGrid';

export function Pricing() {
  return (
    <section style={{ padding: '120px 0 80px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <SectionLabel>Investment in Wisdom</SectionLabel>
        <h2
          style={{
            fontFamily: "'Lora', serif",
            fontWeight: 400,
            letterSpacing: '-0.01em',
            fontSize: '48px',
            marginBottom: '20px',
            color: '#1A2420',
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
      </div>
    </section>
  );
}
