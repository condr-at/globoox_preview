'use client';

import { useState } from 'react';

export function CTA() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      style={{
        padding: '120px 0',
        textAlign: 'center',
        background: '#1A2420',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
      <h2
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          letterSpacing: '-0.01em',
          fontSize: '48px',
          marginBottom: '24px',
          color: '#FFFFFF',
        }}
      >
        Begin your first chapter free.
      </h2>
      <p
        style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '40px',
          maxWidth: '600px',
          margin: '0 auto 40px',
        }}
      >
        No commitment required. We&apos;ll translate your first three books with our compliments.
      </p>
      <button
        style={{
          display: 'inline-block',
          background: isHovered ? '#C4826E' : '#FFFFFF',
          color: isHovered ? '#FFFFFF' : '#1A2420',
          padding: '16px 32px',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '16px',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {}}
      >
        Get Started — It&apos;s Free
      </button>
      </div>
    </section>
  );
}
