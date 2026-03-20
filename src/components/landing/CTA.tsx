'use client';

import { useState } from 'react';

interface CTAProps {
  heading: string;
  description?: string;
  buttonText: string;
}

export function CTA({
  heading,
  description = 'Upload your EPUB and enjoy it in your language.',
  buttonText,
}: CTAProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      className="cta-section"
      style={{
        padding: '240px 0 180px 0',
        textAlign: 'center',
        background: 'var(--ink)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating multilingual scripts */}
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '52px', pointerEvents: 'none', top: '5%', left: '3%', animation: 'float 8s infinite ease-in-out' }}>Lesen</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '64px', pointerEvents: 'none', top: '18%', right: '5%', animation: 'float 8s infinite ease-in-out', animationDelay: '2s' }}>読む</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '44px', pointerEvents: 'none', bottom: '15%', left: '10%', animation: 'float 8s infinite ease-in-out', animationDelay: '4s' }}>Lire</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '58px', pointerEvents: 'none', bottom: '25%', right: '8%', animation: 'float 8s infinite ease-in-out', animationDelay: '1s' }}>Читать</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '48px', pointerEvents: 'none', top: '40%', left: '2%', animation: 'float 8s infinite ease-in-out', animationDelay: '3s' }}>Leggere</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '56px', pointerEvents: 'none', top: '8%', right: '22%', animation: 'float 8s infinite ease-in-out', animationDelay: '5s' }}>قراءة</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '42px', pointerEvents: 'none', bottom: '8%', right: '30%', animation: 'float 8s infinite ease-in-out', animationDelay: '0.5s' }}>Ler</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '60px', pointerEvents: 'none', top: '55%', right: '2%', animation: 'float 8s infinite ease-in-out', animationDelay: '3.5s' }}>읽다</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '46px', pointerEvents: 'none', bottom: '5%', left: '30%', animation: 'float 8s infinite ease-in-out', animationDelay: '6s' }}>Okumak</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '50px', pointerEvents: 'none', top: '3%', left: '35%', animation: 'float 8s infinite ease-in-out', animationDelay: '1.5s' }}>Läsa</div>
      <div className="floating-script" style={{ position: 'absolute', fontFamily: "'Lora', serif", color: 'var(--parchment)', opacity: 0.07, fontSize: '54px', pointerEvents: 'none', top: '65%', left: '18%', animation: 'float 8s infinite ease-in-out', animationDelay: '4.5s' }}>पढ़ना</div>


      <div className="cta-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
      <h2
        className="cta-heading"
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          letterSpacing: '-0.01em',
          fontSize: '48px',
          marginBottom: '24px',
          color: '#FFFFFF',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontSize: '18px',
          color: 'var(--ash)',
          lineHeight: 1.7,
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px',
        }}
      >
        {description}
      </p>
      <button
        style={{
          display: 'inline-block',
          background: isHovered ? 'var(--dusk)' : 'var(--parchment)',
          color: 'var(--ink)',
          padding: '16px 32px',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '16px',
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
          border: '1px solid rgba(244, 240, 232, 0.12)',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isHovered
            ? '0 10px 28px rgba(232, 184, 154, 0.28)'
            : '0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 24px rgba(0,0,0,0.12)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => { window.location.href = '/my-books'; }}
      >
        {buttonText}
      </button>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .cta-section {
            padding: 160px 0 120px 0 !important;
          }
          .cta-heading {
            font-size: 36px !important;
          }
          .cta-container {
            padding: 0 20px !important;
          }

        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .cta-section {
            padding: 120px 0 100px 0 !important;
          }
          .floating-script {
            font-size: 36px !important;
          }
        }
      `}</style>
    </section>
  );
}
