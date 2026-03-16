import { SectionLabel } from './SectionLabel';
import { ComparisonTable } from './ComparisonTable';

export function ComparisonSection() {
  return (
    <section style={{ padding: '0 0 120px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionLabel>Detailed Comparison</SectionLabel>
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
            Every nuance compared.
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: '#5E6771',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            See exactly what each plan includes, from the essentials to the advanced features that power serious readers.
          </p>
        </div>

        <ComparisonTable />
      </div>
    </section>
  );
}
