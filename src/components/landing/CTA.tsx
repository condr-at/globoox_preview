'use client';

import { useState } from 'react';

export function CTA() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      style={{
        padding: '120px 0',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          letterSpacing: '-0.01em',
          fontSize: '48px',
          marginBottom: '24px',
          color: '#1A1F2B',
        }}
      >
        Begin your first chapter free.
      </h2>
      <p
        style={{
          fontSize: '20px',
          color: '#5E6771',
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
          background: isHovered ? '#963F26' : '#B25032',
          color: 'white',
          padding: '16px 32px',
          borderRadius: '8px',
          fontWeight: 500,
          textDecoration: 'none',
          fontSize: '16px',
          transition: 'background 0.2s ease',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {}}
      >
        Get Started — It&apos;s Free
      </button>
    </section>
  );
}
