'use client';

import { useRef, useState, useEffect } from 'react';

export function CompareSlider() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const move = (clientX: number) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100));
    setPosition(p);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) move(e.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current) move(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div style={{ marginTop: '40px', width: '100%' }}>
      <div
        ref={wrapRef}
        onMouseDown={(e) => {
          isDragging.current = true;
          move(e.clientX);
        }}
        onTouchStart={(e) => {
          isDragging.current = true;
          move(e.touches[0].clientX);
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'col-resize',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '32px',
            fontSize: '14px',
            lineHeight: 1.8,
            fontFamily: "'Lora', serif",
            background: '#fcfcfc',
            color: '#1A1F2B',
          }}
        >
          <span style={{ maxWidth: '480px', display: 'block', margin: '0 auto' }}>

            Около 70 000 лет назад организмы, принадлежащие к виду Homo sapiens, начали формировать ещё более крупные и сложные структуры, называемые культурами. Последующее развитие этих культур называется историей.
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '32px',
            fontSize: '14px',
            lineHeight: 1.8,
            fontFamily: "'Lora', serif",
            background: '#fffbf9',
            color: '#B25032',
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <span style={{ maxWidth: '480px', display: 'block', margin: '0 auto' }}>
            About 70,000 years ago, organisms belonging to the species Homo sapiens started to form even larger and more complex structures called cultures. The subsequent development of these human cultures is called history.
          </span>
        </div>

        <span
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '4px',
            background: '#eee',
            color: '#666',
            zIndex: 5,
          }}
        >
          ORIGINAL ENGLISH
        </span>

        <span
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '4px',
            background: '#fdeee9',
            color: '#B25032',
            zIndex: 5,
          }}
        >
          RUSSIAN TRANSLATION
        </span>

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${position}%`,
            width: '1px',
            height: '100%',
            background: '#B25032',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${position}%`,
            transform: 'translate(-50%, -50%)',
            width: '36px',
            height: '36px',
            background: 'white',
            border: '1px solid #B25032',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4,
            userSelect: 'none',
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#B25032" strokeWidth="2.5">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
