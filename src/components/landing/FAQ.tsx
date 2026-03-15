'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How does Globoox translate books?',
    answer: 'Globoox uses advanced AI translation technology to translate e-books while preserving the original nuance, style, and literary depth. Our neural networks are trained on millions of literary texts to ensure translations sound natural in your language.',
  },
  {
    question: 'Which languages are supported?',
    answer: 'We currently support 50+ languages including major European languages, Asian languages, and more. We\'re constantly adding new languages based on user demand.',
  },
  {
    question: 'Can I download books for offline reading?',
    answer: 'Yes! Premium members can download translated books for offline reading. This works across all your devices with automatic syncing when you\'re back online.',
  },
  {
    question: 'What happens to my reading progress?',
    answer: 'Your reading position is automatically saved and synced across all your devices. Switch from phone to tablet to desktop seamlessly without losing your place.',
  },
  {
    question: 'Is my data private?',
    answer: 'Absolutely. We use end-to-end encryption for all your personal data. Your reading history, preferences, and saved books are private and never shared with third parties.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription anytime without penalties or hidden fees. Your access continues until the end of your billing period.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
          Questions?
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
          Frequently Asked Questions
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
          Find answers to common questions about Globoox
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {faqItems.map((item, index) => (
          <div
            key={index}
            style={{
              borderBottom: '1px solid #E0D9D0',
              paddingTop: index === 0 ? 0 : '24px',
              paddingBottom: '24px',
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#1A1F2B',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'left',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#B25032';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1A1F2B';
              }}
            >
              {item.question}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  flexShrink: 0,
                  marginLeft: '16px',
                  transition: 'transform 0.3s ease',
                  transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>

            {openIndex === index && (
              <div
                style={{
                  paddingTop: '16px',
                  marginTop: '16px',
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: '#666',
                  animation: 'slideDown 0.3s ease',
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
