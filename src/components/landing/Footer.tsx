export function Footer() {
  return (
    <footer
      style={{
        marginTop: '60px',
        padding: '60px 0',
        textAlign: 'center',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        color: '#5E6771',
        fontSize: '14px',
      }}
    >
      <p>© 2024 Globoox Inc. Curating the world&apos;s wisdom.</p>
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
        }}
      >
        <a
          href="#"
          style={{
            color: '#5E6771',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Terms of Service
        </a>
        <a
          href="#"
          style={{
            color: '#5E6771',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </a>
        <a
          href="#"
          style={{
            color: '#5E6771',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.2s ease',
          }}
          onClick={(e) => e.preventDefault()}
        >
          Contact Support
        </a>
      </div>
    </footer>
  );
}
