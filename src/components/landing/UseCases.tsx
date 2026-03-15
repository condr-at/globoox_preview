'use client';

import { useEffect, useState } from 'react';

interface UseCase {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
}

const useCases: UseCase[] = [
  {
    icon: '📚',
    title: 'Literature Students',
    subtitle: 'Dive deeper into world literature',
    description:
      'Read original texts in their native languages to understand nuance, cultural context, and literary devices that translation often loses. Perfect for comparative literature and language studies.',
    benefits: ['Preserve original meaning', 'Learn language naturally', 'Analyze literary style', 'Academic research'],
  },
  {
    icon: '🌍',
    title: 'Language Learners',
    subtitle: 'Immerse yourself in authentic content',
    description:
      'Access contemporary books, news, and literature in your target language at your own pace. Build vocabulary and reading comprehension through engaging stories, not textbooks.',
    benefits: ['Real-world language', 'Contextual learning', 'Self-paced progression', 'Engaging content'],
  },
  {
    icon: '🔬',
    title: 'Researchers & Academics',
    subtitle: 'Access global knowledge without limits',
    description:
      'Read research papers, academic texts, and specialized knowledge from around the world in your preferred language. Never let language barriers limit your research.',
    benefits: ['Break language barriers', 'Access global research', 'Maintain academic rigor', 'Faster comprehension'],
  },
  {
    icon: '❤️',
    title: 'Book Lovers',
    subtitle: 'Expand your literary horizons',
    description:
      'Discover bestsellers and hidden gems from every corner of the world. Read the books everyone is talking about, regardless of what language they were originally written in.',
    benefits: ['Discover new authors', 'Read global bestsellers', 'Join worldwide conversations', 'Unlimited selection'],
  },
];

export function UseCases() {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    useCases.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleIndices((prev) => new Set(prev).add(index));
      }, index * 150);

      return () => clearTimeout(timer);
    });
  }, []);

  return (
    <section style={{ padding: '120px 0' }}>
      <div style={{ marginBottom: '80px', textAlign: 'center' }}>
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
          Who Uses Globoox
        </span>
        <h2
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '48px',
            lineHeight: 1.1,
            color: '#1A1F2B',
            marginBottom: '24px',
          }}
        >
          Perfect for every kind of reader
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Whatever brings you to reading, Globoox adapts to your needs
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
        }}
      >
        {useCases.map((useCase, index) => (
          <div
            key={index}
            style={{
              opacity: visibleIndices.has(index) ? 1 : 0,
              transform: visibleIndices.has(index) ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              padding: '40px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E0D9D0',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: '48px',
              }}
            >
              {useCase.icon}
            </div>

            {/* Title */}
            <div>
              <h3
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '24px',
                  fontWeight: 400,
                  color: '#1A1F2B',
                  marginBottom: '8px',
                }}
              >
                {useCase.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#B25032',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                {useCase.subtitle}
              </p>
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#666',
                margin: 0,
              }}
            >
              {useCase.description}
            </p>

            {/* Benefits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px' }}>
              {useCase.benefits.map((benefit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#B25032',
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#666' }}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
