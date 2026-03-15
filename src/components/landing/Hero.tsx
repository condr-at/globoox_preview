'use client';

import { useState } from 'react';
import { SectionLabel } from './SectionLabel';

interface HeroProps {
  variant?: 'centered' | 'split';
  withBooks?: boolean;
}

function BookSpine({ title, height, bg, textColor }: { title: string; height: number; bg: string; textColor?: string }) {
  return (
    <div
      className="spine-hover"
      style={{
        width: '45px',
        height: `${height}px`,
        background: bg,
        borderRadius: '4px',
        borderLeft: '3px solid rgba(0,0,0,0.05)',
        boxShadow: '10px 10px 30px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '20px 0',
        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.05) 100%)',
          zIndex: 1,
        }}
      />
      <span
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontFamily: "'Lora', serif",
          fontSize: '14px',
          color: textColor || '#5E6771',
          margin: '0 auto',
          opacity: 0.8,
          transform: 'rotate(180deg)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {title}
      </span>
    </div>
  );
}

function FloatingScript({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: "'Lora', serif",
        color: '#B25032',
        opacity: 0.15,
        fontSize: '24px',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hero({ variant = 'centered', withBooks = false }: HeroProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'split' && withBooks) {
    return (
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '90vh',
          alignItems: 'center',
          gap: '60px',
          padding: '60px 0',
        }}
      >
        <div
          style={{
            textAlign: 'left' as const,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start' as const,
          }}
        >
          <SectionLabel>Introducing Globoox</SectionLabel>
          <h1
            style={{
              fontSize: '64px',
              lineHeight: 1.1,
              marginBottom: '28px',
              fontWeight: 500,
              fontFamily: "'Lora', serif",
              color: '#1A1F2B',
            }}
          >
            The world&apos;s library, in your native language.
          </h1>
          <p
            style={{
              fontSize: '20px',
              color: '#5E6771',
              marginBottom: '44px',
              maxWidth: '520px',
            }}
          >
            Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.
          </p>
          <button
            className="btn-primary-hover"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {}}
            style={{
              display: 'inline-block',
              background: isHovered ? '#963F26' : '#B25032',
              color: 'white',
              padding: '18px 40px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '16px',
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${isHovered ? 'rgba(150, 63, 38, 0.25)' : 'rgba(178, 80, 50, 0.25)'}`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Start Reading Free
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '500px',
              background: 'rgba(178, 80, 50, 0.03)',
              borderRadius: '200px 40px 200px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '1000px',
            }}
          >
            <FloatingScript style={{ top: '15%', left: '10%', animation: 'float 8s infinite ease-in-out' }}>
              哲学
            </FloatingScript>
            <FloatingScript
              style={{ bottom: '20%', right: '15%', animation: 'float 8s infinite ease-in-out', animationDelay: '2s', fontSize: '32px' }}
            >
              Poésie
            </FloatingScript>
            <FloatingScript style={{ top: '25%', right: '20%', animation: 'float 8s infinite ease-in-out', animationDelay: '4s' }}>
              قصة
            </FloatingScript>
            <FloatingScript style={{ bottom: '10%', left: '25%', animation: 'float 8s infinite ease-in-out', animationDelay: '1s' }}>
              History
            </FloatingScript>

            <div style={{ display: 'flex', gap: '12px', transform: 'rotate(-5deg)' }}>
              <BookSpine title="Moby Dick" height={320} bg="#E8E4DF" />
              <BookSpine title="Anna Karenina" height={280} bg="#DED9D2" />
              <BookSpine title="Globoox Engine" height={340} bg="#1A1F2B" textColor="#D48B77" />
              <BookSpine title="The Odyssey" height={280} bg="#DED9D2" />
              <BookSpine title="Don Quixote" height={320} bg="#E8E4DF" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Centered variant (default)
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: '80px 0',
        minHeight: '80vh',
      }}
    >
      <SectionLabel>Introducing Globoox</SectionLabel>
      <h1
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          letterSpacing: '-0.01em',
          fontSize: '56px',
          lineHeight: 1.1,
          marginBottom: '24px',
          maxWidth: '900px',
          color: '#1A1F2B',
        }}
      >
        The world&apos;s library, in your native language.
      </h1>
      <p
        style={{
          fontSize: '20px',
          color: '#5E6771',
          marginBottom: '40px',
          maxWidth: '600px',
        }}
      >
        Instantly translate any e-book and experience stories with the nuance and depth they were meant to be read.
      </p>
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {}}
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
      >
        Start Reading Free
      </button>
    </header>
  );
}
