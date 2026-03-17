'use client';

import { useEffect, useRef, useState } from 'react';

// ─── timing (ms) ─────────────────────────────────────────────────────────────
const T_IDLE            = 1200;
const T_BTN_FLASH       = 80;    // одно мигание кнопки Add
const T_PAUSE_EMPTY     = 1100;  // смотрим на пустой drawer
const T_TAP_FLASH       = 500;   // вспышка зоны выбора
const T_SPINNER         = 1600;  // спиннер
const T_FILE_APPEAR     = 500;   // файл появляется
const T_PAUSE_FILE      = 900;   // пауза на файле — кнопка Upload активна
const T_UPLOAD_TAP      = 120;   // flash кнопки Upload перед стартом
const T_UPLOADING       = 2000;  // прогресс 0→100
const T_PAUSE_DONE      = 900;   // пауза на чекмарке
const T_DRAWER_CLOSE    = 420;
const T_PAUSE_BOOK      = 600;
const T_HOLD            = 2600;
const T_FADE_OUT        = 1000;
const T_FADE_IN         = 800;

// высота зоны выбора файла — фиксирована чтобы drawer не скакал
const DRAWER_ZONE_H = 110;

type Phase =
  | 'idle'
  | 'btn-flash'
  | 'drawer-empty'
  | 'tap-flash'
  | 'spinner'
  | 'file-ready'
  | 'upload-tap'
  | 'uploading'
  | 'upload-done'
  | 'drawer-closing'
  | 'book-appear'
  | 'hold'
  | 'fade-out'
  | 'fade-in';

// ─── colours (forest-light) ───────────────────────────────────────────────────
const C = {
  bg:           '#F4F0E8',
  header:       '#FFFFFF',
  statusBar:    '#FFFFFF',
  separator:    'rgba(44,59,45,0.18)',
  text:         '#2C3B2D',
  textSecond:   'rgba(44,59,45,0.6)',
  textMuted:    'rgba(44,59,45,0.4)',
  accent:       '#C05A3A',
  accentBg:     'rgba(192,90,58,0.1)',
  drawerBg:     '#FFFFFF',
  drawerInput:  '#F4F0E8',
  coverShadow:  'rgba(44,59,45,0.18)',
  progressBg:   'rgba(44,59,45,0.1)',
  successGreen: '#7A8C7B',
};

// ─── mock books ───────────────────────────────────────────────────────────────
const EXISTING_BOOKS = [
  { title: 'The Art of War',           author: 'Sun Tzu',         color: '#A0896E', progress: 74 },
  { title: 'On the Origin of Species', author: 'Charles Darwin',  color: '#6B8C7A', progress: 41 },
  { title: 'The Prince',               author: 'Machiavelli',     color: '#7A8A6E', progress: 88 },
  { title: 'Walden',                   author: 'Henry Thoreau',   color: '#8A7A6E', progress: 22 },
  { title: 'Thus Spoke Zarathustra',   author: 'Nietzsche',       color: '#7A9BAA', progress: 0  },
];
const NEW_BOOK = { title: 'Meditations', author: 'Marcus Aurelius', color: '#9B8AAB' };

// ─── mini book cover ──────────────────────────────────────────────────────────
function MiniCover({ color, progress = 0, visible = true, animate = false }: {
  color: string; progress?: number; visible?: boolean; animate?: boolean;
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '2/3',
      borderRadius: 6,
      backgroundColor: color,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 2px 8px ${C.coverShadow}`,
      opacity: visible ? 1 : 0,
      transform: animate
        ? 'translateY(0) scale(1)'
        : visible ? 'translateY(0)' : 'translateY(12px) scale(0.93)',
      transition: animate
        ? 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1)'
        : 'none',
    }}>
      <div style={{ position: 'absolute', bottom: 10, left: 7, right: 7 }}>
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '88%' }} />
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginBottom: 3, width: '65%' }} />
        <div style={{ height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', width: '50%' }} />
      </div>
      {progress > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: C.progressBg }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: C.accent }} />
        </div>
      )}
    </div>
  );
}

// ─── spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 22, height: 22,
      border: `2.5px solid ${C.accentBg}`,
      borderTopColor: C.accent,
      borderRadius: '50%',
      animation: 'mybooksmock-spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ─── upload drawer ────────────────────────────────────────────────────────────
function UploadDrawer({ open, phase, uploadPct }: {
  open: boolean; phase: Phase; uploadPct: number;
}) {
  const showEmpty       = phase === 'drawer-empty' || phase === 'tap-flash';
  const showSpinner     = phase === 'spinner';
  const showFile        = phase === 'file-ready' || phase === 'upload-tap' || phase === 'uploading' || phase === 'upload-done';
  const tapFlash        = phase === 'tap-flash';
  const isUploading     = phase === 'uploading';
  const isDone          = phase === 'upload-done';
  const uploadBtnActive = phase === 'file-ready';
  const uploadBtnTap    = phase === 'upload-tap';
  // во время загрузки зона показывает спиннер/прогресс вместо файла
  const showProgress    = phase === 'uploading' || phase === 'upload-done';

  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor: C.drawerBg,
      borderRadius: '16px 16px 0 0',
      transform: open ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
      zIndex: 10,
      boxShadow: '0 -2px 20px rgba(0,0,0,0.10)',
      borderTop: `0.5px solid ${C.separator}`,
    }}>
      {/* drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(44,59,45,0.15)', margin: '12px auto 0' }} />

      {/* title + description */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Upload Book</div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>Add an EPUB from your device.</div>
      </div>

      {/* ── file zone: фиксированная высота, слои через absolute ── */}
      <div style={{ position: 'relative', height: DRAWER_ZONE_H, margin: '12px 16px' }}>

        {/* слой 1: пустое + tap-flash */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showEmpty ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showEmpty ? 'auto' : 'none',
        }}>
          <div style={{
            backgroundColor: tapFlash ? C.accentBg : C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8,
            border: `1.5px dashed ${tapFlash ? C.accent : C.separator}`,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke={tapFlash ? C.accent : C.textMuted}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'stroke 0.3s ease' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ color: tapFlash ? C.accent : C.textMuted, fontSize: 13, transition: 'color 0.3s ease' }}>
              Choose an EPUB file
            </span>
          </div>
        </div>

        {/* слой 2: спиннер */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showSpinner ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Spinner />
            <span style={{ color: C.textMuted, fontSize: 13 }}>Reading file…</span>
          </div>
        </div>

        {/* слой 3: файл выбран — иконка FileText + имя (до начала загрузки) */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showFile && !showProgress ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {/* FileText icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.textMuted}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>meditations-aurelius.epub</span>
            <span style={{ color: C.textMuted, fontSize: 11 }}>340 KB · EPUB</span>
          </div>
        </div>

        {/* слой 4: загрузка — спиннер/чекмарк + прогресс-бар */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: showProgress ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: C.drawerInput,
            borderRadius: 12,
            height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '0 20px',
          }}>
            {isDone
              ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke={C.successGreen} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              : <Spinner />
            }
            <span style={{ color: C.textMuted, fontSize: 12 }}>
              {isDone ? 'Book added to your library' : 'Processing…'}
            </span>
            <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: C.progressBg, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${uploadPct}%`,
                backgroundColor: isDone ? C.successGreen : C.accent,
                transition: 'width 0.25s linear, background-color 0.3s ease',
                borderRadius: 2,
              }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── footer: separator + Upload button ── */}
      <div style={{ borderTop: `0.5px solid ${C.separator}` }}>
        <div style={{
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
          fontWeight: uploadBtnActive ? 500 : 400,
          color: uploadBtnTap
            ? 'rgba(192,90,58,0.35)'
            : uploadBtnActive ? C.accent : C.textMuted,
          opacity: uploadBtnActive || uploadBtnTap ? 1 : 0.4,
          transition: uploadBtnTap ? 'color 0.06s ease' : 'color 0.25s ease, opacity 0.25s ease',
        }}>
          Upload
        </div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export function MyBooksMockup() {
  const [phase, setPhase]             = useState<Phase>('idle');
  const [uploadPct, setUploadPct]     = useState(0);
  const [showNewBook, setShowNewBook] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [scale, setScale]             = useState(1);
  const outerRef                      = useRef<HTMLDivElement>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const target = parent ?? el;
    const update = () => {
      const w = target.getBoundingClientRect().width;
      if (w > 0) setScale(Math.min(1, w / 320));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  const schedule = (fn: () => void, delay: number) => {
    timerRef.current = setTimeout(fn, delay);
  };

  const runCycle = () => {
    setPhase('idle');
    setUploadPct(0);
    setShowNewBook(false);
    setFadeOpacity(0);

    schedule(() => {
      // кнопка мигает один раз
      setPhase('btn-flash');

      schedule(() => {
        // сразу drawer выезжает пустым
        setPhase('drawer-empty');

        schedule(() => {
          // пауза в пустом drawer
          schedule(() => {
            // вспышка зоны выбора
            setPhase('tap-flash');

            schedule(() => {
              // спиннер
              setPhase('spinner');

              schedule(() => {
                // файл готов
                setPhase('file-ready');

                schedule(() => {
                  // flash кнопки Upload
                  setPhase('upload-tap');
                  schedule(() => {
                    // загрузка
                    setPhase('uploading');
                    const start = performance.now();
                    const animateProgress = (now: number) => {
                      const pct = Math.min(100, ((now - start) / T_UPLOADING) * 100);
                      setUploadPct(Math.round(pct));
                      if (pct < 100) {
                        rafRef.current = requestAnimationFrame(animateProgress);
                      } else {
                        setPhase('upload-done');
                        schedule(() => {
                          setPhase('drawer-closing');
                          schedule(() => {
                            schedule(() => {
                              setPhase('book-appear');
                              setShowNewBook(true);

                              schedule(() => {
                                setPhase('hold');
                                schedule(() => {
                                  setPhase('fade-out');
                                  let op = 0;
                                  const step = 16 / T_FADE_OUT;
                                  const fadeOut = () => {
                                    op = Math.min(1, op + step);
                                    setFadeOpacity(op);
                                    if (op < 1) {
                                      rafRef.current = requestAnimationFrame(fadeOut);
                                    } else {
                                      setPhase('fade-in');
                                      setUploadPct(0);
                                      setShowNewBook(false);
                                      let op2 = 1;
                                      const stepIn = 16 / T_FADE_IN;
                                      schedule(() => {
                                        const fadeIn = () => {
                                          op2 = Math.max(0, op2 - stepIn);
                                          setFadeOpacity(op2);
                                          if (op2 > 0) {
                                            rafRef.current = requestAnimationFrame(fadeIn);
                                          } else {
                                            runCycle();
                                          }
                                        };
                                        rafRef.current = requestAnimationFrame(fadeIn);
                                      }, 80);
                                    }
                                  };
                                  rafRef.current = requestAnimationFrame(fadeOut);
                                }, T_HOLD);
                              }, 400);
                            }, T_PAUSE_BOOK);
                          }, T_DRAWER_CLOSE);
                        }, T_PAUSE_DONE);
                      }
                    };
                    rafRef.current = requestAnimationFrame(animateProgress);
                  }, T_UPLOAD_TAP);
                }, T_PAUSE_FILE);
                }, T_FILE_APPEAR);
              }, T_SPINNER);
            }, T_TAP_FLASH);
          }, T_PAUSE_EMPTY);
        }, T_BTN_FLASH); // drawer выезжает сразу после вспышки
    }, T_IDLE);
  };

  useEffect(() => {
    runCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawerOpen = phase === 'drawer-empty' || phase === 'tap-flash' || phase === 'spinner'
    || phase === 'file-ready' || phase === 'upload-tap' || phase === 'uploading' || phase === 'upload-done';
  const btnFlash   = phase === 'btn-flash';
  const scrollOffset = drawerOpen ? -60 : 0;

  return (
    <div ref={outerRef} style={{
      width: '100%',
      maxWidth: 320,
      position: 'relative',
      height: 640 * scale,
    }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 320,
      height: 640,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      userSelect: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>

      {/* ── inner scene ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: C.bg,
        transform: `translateY(${scrollOffset}px)`,
        transition: 'transform 0.7s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* status bar */}
        <div style={{
          height: 22,
          backgroundColor: C.statusBar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: `0.5px solid ${C.separator}`,
        }}>
          <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[3,5,7].map((h, i) => (
              <div key={i} style={{ width: 3, height: h, backgroundColor: C.text, borderRadius: 1, opacity: 0.6 }} />
            ))}
            <div style={{ width: 18, height: 9, border: `1.5px solid ${C.text}`, borderRadius: 2, position: 'relative', marginLeft: 3, opacity: 0.6 }}>
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, backgroundColor: C.text, borderRadius: '0 1px 1px 0' }} />
              <div style={{ position: 'absolute', inset: 2, right: 3, backgroundColor: C.text, borderRadius: 0.5 }} />
            </div>
          </div>
        </div>

        {/* nav header */}
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: C.header,
          borderBottom: `0.5px solid ${C.separator}`,
        }}>
          <span style={{ color: C.text, fontSize: 17, fontWeight: 600 }}>My Books</span>
          <button style={{
            backgroundColor: btnFlash ? C.accent : C.accentBg,
            color: btnFlash ? '#fff' : C.accent,
            border: 'none',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: btnFlash
              ? 'background-color 0.08s ease, color 0.08s ease'
              : 'background-color 0.25s ease, color 0.25s ease',
          }}>
            + Add
          </button>
        </div>

        {/* filter pills */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', backgroundColor: C.bg }}>
          {['Visible', 'Hidden', 'All'].map((f, i) => (
            <div key={f} style={{
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: i === 0 ? C.accent : 'transparent',
              color: i === 0 ? '#fff' : C.textSecond,
              border: i === 0 ? 'none' : `1px solid ${C.separator}`,
            }}>{f}</div>
          ))}
        </div>

        {/* book grid */}
        <div style={{
          padding: '4px 16px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}>
          {EXISTING_BOOKS.map((b) => (
            <div key={b.title}>
              <MiniCover color={b.color} progress={b.progress} />
              <div style={{ marginTop: 5 }}>
                <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {b.title}
                </div>
                <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{b.author}</div>
              </div>
            </div>
          ))}

          {/* new book slot */}
          <div>
            <MiniCover color={NEW_BOOK.color} visible={showNewBook} animate={showNewBook} />
            {showNewBook && (
              <div style={{ marginTop: 5 }}>
                <div style={{ color: C.text, fontSize: 10, fontWeight: 500, lineHeight: 1.35 }}>{NEW_BOOK.title}</div>
                <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>{NEW_BOOK.author}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── drawer ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <UploadDrawer open={drawerOpen} phase={phase} uploadPct={uploadPct} />
      </div>

      {/* ── fade overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: C.bg,
        opacity: fadeOpacity,
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes mybooksmock-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </div>
  );
}
