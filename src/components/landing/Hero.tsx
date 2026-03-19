'use client';

import { useState } from 'react';
import { SectionLabel } from './SectionLabel';

interface HeroProps {
  variant?: 'centered' | 'split';
  withBooks?: boolean;
  title: string;
  subtitle: string;
  titleClassName?: string;
}

function BookSpine({ title, height, bg, textColor, className }: { title: string; height: number; bg: string; textColor?: string; className?: string }) {
  return (
    <div className="spine-wrap" style={{ position: 'relative', flexShrink: 0 }}>
      <div className="spine-shadow" />
      <div
        className={`spine-hover ${className || ''}`}
        style={{
          width: '58px',
          height: `${height}px`,
          background: bg,
          borderRadius: '4px',
          borderLeft: '3px solid rgba(0,0,0,0.05)',
          boxShadow: '6px 12px 20px rgba(0,0,0,0.18), 2px 4px 6px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '20px 0',
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
          cursor: 'default',
          zIndex: 1,
        }}
      >
        {/* Блик — выпуклость корешка */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.12) 100%)',
            zIndex: 1,
          }}
        />
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontFamily: "'Lora', serif",
            fontSize: '18px',
            color: textColor || 'var(--ink-80)',
            fontWeight: textColor ? 400 : 500,
            margin: '0 auto',
            opacity: textColor ? 0.8 : 1,
            transform: 'rotate(180deg)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}

function FloatingScript({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: "'Lora', serif",
        color: 'var(--primary)',
        opacity: 0.15,
        fontSize: '31px',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hero({ variant = 'centered', withBooks = false, title, subtitle, titleClassName }: HeroProps) {
  const [isHovered, setIsHovered] = useState(false);

  const responsiveStyles = `
    /* Split variant */
    @media (max-width: 639px) {
      .hero-split {
        grid-template-columns: 1fr !important;
        padding: 40px 20px !important;
        gap: 32px !important;
        min-height: auto !important;
        overflow-x: clip !important;
      }
      .hero-split-text {
        text-align: center !important;
        align-items: center !important;
      }
      .hero-split-h1 {
        font-size: 36px !important;
      }
      .hero-split-p {
        font-size: 17px !important;
      }
      .hero-split-btn {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
      .hero-books-section {
        max-height: 300px !important;
        overflow: hidden !important;
      }
      .hero-books-blob {
        height: 300px !important;
        width: 100% !important;
      }
      .spine-hover {
        width: 40px !important;
      }
      .spine-hover span {
        font-size: 14px !important;
      }
      .spine-long-title span { font-size: 12px !important; }
      .spine-longest-title span { font-size: 10.5px !important; }
      .spine-h-416 { height: 233px !important; }
      .spine-h-364 { height: 204px !important; }
      .spine-h-442 { height: 247px !important; }
      .spine-desiguales { height: 240px !important; }
      /* Centered variant */
      .hero-centered {
        padding: 40px 20px !important;
        min-height: auto !important;
      }
      .hero-centered-h1 {
        font-size: 36px !important;
      }
      .hero-centered-p {
        font-size: 17px !important;
      }
      .hero-centered-btn {
        padding: 14px 28px !important;
        font-size: 15px !important;
      }
    }
    @media (min-width: 640px) and (max-width: 1023px) {
      .hero-split {
        grid-template-columns: 1fr !important;
        padding: 50px 32px !important;
        gap: 40px !important;
      }
      .hero-split-text {
        text-align: center !important;
        align-items: center !important;
      }
      .hero-split-h1 {
        font-size: 48px !important;
      }
      .hero-split-btn {
        padding: 16px 34px !important;
      }
      .hero-books-section {
        max-height: 400px !important;
      }
      .hero-books-blob {
        height: 400px !important;
        width: 100% !important;
      }
      .spine-h-416 { height: 333px !important; }
      .spine-h-364 { height: 291px !important; }
      .spine-h-442 { height: 354px !important; }
      .spine-desiguales { height: 310px !important; }
      .spine-long-title span { font-size: 16px !important; }
      .spine-longest-title span { font-size: 14px !important; }
      /* Centered variant */
      .hero-centered {
        padding: 60px 32px !important;
      }
      .hero-centered-h1 {
        font-size: 48px !important;
      }
      .hero-centered-btn {
        padding: 16px 34px !important;
      }
    }
  `;

  if (variant === 'split' && withBooks) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
        <header
          className="hero-split"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '90vh',
            alignItems: 'center',
            gap: '60px',
            padding: '60px 40px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div
            className="hero-split-text"
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
              className={`hero-split-h1 ${titleClassName || ''}`}
              style={{
                fontSize: titleClassName ? undefined : '64px',
                lineHeight: 1.1,
                marginBottom: '28px',
                fontWeight: 500,
                fontFamily: "'Lora', serif",
                color: 'var(--ink)',
              }}
            >
              {title}
            </h1>
            <p
              className="hero-split-p"
              style={{
                fontSize: '20px',
                color: 'var(--ash)',
                marginBottom: '44px',
                maxWidth: '520px',
              }}
            >
              {subtitle}
            </p>
            <button
              className="btn-primary-hover hero-split-btn"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => { window.location.href = '/my-books'; }}
              style={{
                display: 'inline-block',
                background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
                color: 'white',
                padding: '18px 40px',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${isHovered ? 'rgba(163, 77, 50, 0.25)' : 'rgba(var(--primary-rgb, 192, 90, 58), 0.25)'}`,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Start Reading Free
            </button>
          </div>

          <div
            className="hero-books-section"
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
            }}
          >
            <div
              className="hero-books-blob"
              style={{
                position: 'relative',
                width: '130%',
                height: '650px',
                background: 'rgba(var(--primary-rgb, 192, 90, 58), 0.03)',
                borderRadius: '260px 52px 260px 52px',
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
                style={{ bottom: '20%', right: '15%', animation: 'float 8s infinite ease-in-out', animationDelay: '2s', fontSize: '42px' }}
              >
                Poésie
              </FloatingScript>
              <FloatingScript style={{ top: '25%', right: '20%', animation: 'float 8s infinite ease-in-out', animationDelay: '4s' }}>
                قصة
              </FloatingScript>
              <FloatingScript style={{ bottom: '10%', left: '25%', animation: 'float 8s infinite ease-in-out', animationDelay: '1s' }}>
                History
              </FloatingScript>

              <div style={{ display: 'flex', gap: '16px', transform: 'rotate(-5deg)', alignItems: 'flex-end' }}>
                <BookSpine title="Nexus. Yuval Noah Harari" height={416} bg="var(--parchment-light)" className="spine-h-416 spine-long-title" />
                <BookSpine title="Эволюция Человека. А. Марков" height={364} bg="var(--parchment-light)" className="spine-h-364 spine-long-title spine-longest-title" />
                <BookSpine title="Globoox Engine" height={442} bg="var(--ink)" textColor="#E8A996" className="spine-h-442" />
                <BookSpine title="Desiguales. Diego Castañeda Garza" height={364} bg="var(--parchment-light)" className="spine-h-364 spine-desiguales spine-long-title spine-longest-title" />
                <BookSpine title="Manet, le secret. Sophie Chauveau" height={416} bg="var(--parchment-light)" className="spine-h-416 spine-long-title" />
              </div>
            </div>
          </div>
        </header>
      </>
    );
  }

  // Centered variant (default)
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      <header
        className="hero-centered"
        style={{
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center' as const,
          padding: '80px 40px',
          minHeight: '80vh',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <SectionLabel>Introducing Globoox</SectionLabel>
        <h1
          className={`hero-centered-h1 ${titleClassName || ''}`}
          style={{
            fontFamily: "'Lora', serif",
            fontWeight: 400,
            letterSpacing: '-0.01em',
            fontSize: titleClassName ? undefined : '56px',
            lineHeight: 1.1,
            marginBottom: '24px',
            maxWidth: '900px',
            }}
        >
          {title}
        </h1>
        <p
          className="hero-centered-p"
          style={{
            fontSize: '20px',
            color: 'var(--ash)',
            marginBottom: '40px',
            maxWidth: '600px',
          }}
        >
          {subtitle}
        </p>
        <button
          className="hero-centered-btn"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => { window.location.href = '/my-books'; }}
          style={{
            display: 'inline-block',
            background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
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
    </>
  );
}
