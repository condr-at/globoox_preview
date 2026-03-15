'use client';

import { useEffect, useState } from 'react';

interface Review {
  name: string;
  role: string;
  avatar: string;
  text: string;
  rating: number;
}

const reviews: Review[] = [
  {
    name: 'Sofia Martinez',
    role: 'Literature Student',
    avatar: '👩‍🎓',
    text: 'Finally, I can read books in their original language without struggling. The translations maintain the poetic beauty that gets lost in traditional translations.',
    rating: 5,
  },
  {
    name: 'Marco Rossi',
    role: 'Language Learner',
    avatar: '👨‍💼',
    text: 'I\'m learning Italian and this app is incredible. I can read contemporary novels at my pace, with instant translations helping me understand context.',
    rating: 5,
  },
  {
    name: 'Yuki Tanaka',
    role: 'Book Enthusiast',
    avatar: '👩‍💻',
    text: 'The synchronization across devices is seamless. Start reading on my phone during commute, continue on tablet at home. Perfect experience.',
    rating: 5,
  },
  {
    name: 'Emma Thompson',
    role: 'Book Club Organizer',
    avatar: '👩‍🏫',
    text: 'Our international book club finally found the perfect solution. We can all read the same books in our native languages simultaneously.',
    rating: 5,
  },
  {
    name: 'Ahmed Al-Mansouri',
    role: 'Graduate Researcher',
    avatar: '👨‍🔬',
    text: 'Access to academic literature in Arabic without compromising the original meaning. This changes everything for my research workflow.',
    rating: 5,
  },
  {
    name: 'Lucia Verdi',
    role: 'Avid Reader',
    avatar: '👩‍🎨',
    text: 'The offline reading feature is game-changing. I can read during flights without worrying about internet. Quality never suffers.',
    rating: 5,
  },
];

export function Reviews() {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    reviews.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleIndices((prev) => new Set(prev).add(index));
      }, index * 200);

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
          What Users Say
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
          Loved by Readers Worldwide
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
          Join thousands of readers who've transformed how they read
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
        }}
      >
        {reviews.map((review, index) => (
          <div
            key={index}
            style={{
              opacity: visibleIndices.has(index) ? 1 : 0,
              transform: visibleIndices.has(index) ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              padding: '32px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Stars */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array(review.rating)
                .fill(null)
                .map((_, i) => (
                  <span key={i} style={{ fontSize: '16px' }}>
                    ★
                  </span>
                ))}
            </div>

            {/* Text */}
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.7,
                color: '#666',
                margin: 0,
                flex: 1,
              }}
            >
              "{review.text}"
            </p>

            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F0E8E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}
              >
                {review.avatar}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: '#1A1F2B',
                    fontSize: '16px',
                  }}
                >
                  {review.name}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#999',
                  }}
                >
                  {review.role}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
