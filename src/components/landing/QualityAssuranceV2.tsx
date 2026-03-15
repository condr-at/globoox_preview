export function QualityAssuranceV2() {
  return (
    <section style={{ padding: '120px 0' }}>
      <div style={{ marginBottom: '80px' }}>
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
            margin: 0,
          }}
        >
          Our multi-layer quality system ensures translations preserve literary nuance while maintaining readability in your language.
        </p>
      </div>

      <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
        {/* MacBook mockup */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '900px',
            perspective: '1200px',
          }}
        >
          {/* MacBook body */}
          <div
            style={{
              position: 'relative',
              background: '#D4CCC4',
              borderRadius: '14px 14px 2px 2px',
              padding: '10px',
              boxShadow: '0 40px 80px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}
          >
            {/* Screen bezel */}
            <div
              style={{
                background: '#1A1A1A',
                borderRadius: '10px',
                padding: '8px',
                aspectRatio: '16 / 10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '180px',
                  height: '24px',
                  background: '#000',
                  borderRadius: '0 0 20px 20px',
                  zIndex: 10,
                }}
              />

              {/* Screen content */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #F7F5F2 0%, #F0E8E0 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '16px',
                  fontWeight: 500,
                }}
              >
                Mockup content coming soon
              </div>
            </div>
          </div>

          {/* MacBook base / bottom */}
          <div
            style={{
              height: '20px',
              background: 'linear-gradient(to right, #C0B8B0 0%, #D4CCC4 50%, #C0B8B0 100%)',
              borderRadius: '0 0 20px 20px',
              boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.15)',
            }}
          />

          {/* Stand legs */}
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              height: '8px',
              background: 'linear-gradient(to right, transparent 0%, #A89880 10%, #A89880 90%, transparent 100%)',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    </section>
  );
}
