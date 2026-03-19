interface FooterProps {
  tagline: string;
}

export function Footer({ tagline }: FooterProps) {
  return (
    <footer
      style={{
        padding: '32px 0',
        textAlign: 'center',
        background: 'var(--ink)',
        color: 'var(--ash)',
        fontSize: '13.5px',
      }}
    >
      <div className="footer-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 40px' }}>
      <div
        className="footer-links"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
        }}
      >
        <a
          href="#"
          style={{
            color: 'var(--ash)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '13.5px',
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Terms of Service
        </a>
        <a
          href="#"
          style={{
            color: 'var(--ash)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '13.5px',
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </a>
        <a
          href="#"
          style={{
            color: 'var(--ash)',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '13.5px',
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Contact Support
        </a>
      </div>
      <p style={{ fontSize: '13.5px', color: 'var(--ash)', maxWidth: '760px', margin: '20px auto 0', lineHeight: 1.6 }}>
        {tagline}<br/>Globoox © 2026
      </p>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .footer-container {
            padding: 0 20px !important;
          }
          .footer-links {
            flex-direction: column !important;
            align-items: center !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </footer>
  );
}
