import { ReactNode } from 'react';

export const metadata = {
  title: 'Globoox - The world\'s library, in your native language',
  description: 'Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.',
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background-color: #F7F5F2;
    color: #1A1F2B;
    line-height: 1.6;
    overflow-x: hidden;
  }

  h1, h2, h3 {
    font-family: 'Lora', serif;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: #1A1F2B;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0); }
    50% { transform: translateY(-30px) rotate(5deg); }
  }

  .spine-hover:hover {
    transform: translateY(-20px) scale(1.05) rotate(2deg) !important;
    z-index: 10;
  }

  .btn-primary-hover:hover {
    background: #963F26 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(178, 80, 50, 0.3) !important;
  }

  .footer-link:hover {
    color: #B25032;
  }

  a {
    color: #B25032;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
        {children}
      </div>
    </>
  );
}
