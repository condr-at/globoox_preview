'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/lib/store';

// Apple Intelligence exact color palette from tutorial
const LAYER_CONFIGS = [
  { 
    colors: ['#0f00ff', '#ae1b6e', '#cf0000', '#ff9f10'], 
    glowSize: 42, 
    opacity: 0.2,
    speedMultiplier: 3,
    coverage: 1 
  },
  { 
    colors: ['#2f00ff', '#ae1b7c', '#cf0000', '#ffa435'], 
    glowSize: 6, 
    opacity: 0.7,
    speedMultiplier: 1,
    coverage: 1 
  },
  { 
    colors: ['#e9e3ff', '#ff54c5', '#ff2657', '#ffc388'], 
    glowSize: 1, 
    opacity: 1,
    speedMultiplier: 1,
    coverage: 1 
  },
  { 
    colors: ['#5b68ff', '#b2dfff'], 
    glowSize: 4, 
    opacity: 0.4,
    speedMultiplier: 2,
    coverage: 0.4 
  },
  { 
    colors: ['#FFFFFF'], 
    glowSize: 2, 
    opacity: 0.4,
    speedMultiplier: 2,
    coverage: 0.4 
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

function interpolateColors(colors: string[], t: number): { r: number; g: number; b: number } {
  if (colors.length === 1) return hexToRgb(colors[0]);
  
  const segmentCount = colors.length;
  const segment = Math.floor(t * segmentCount) % segmentCount;
  const nextSegment = (segment + 1) % segmentCount;
  const segmentT = (t * segmentCount) % 1;
  
  const c1 = hexToRgb(colors[segment]);
  const c2 = hexToRgb(colors[nextSegment]);
  
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * segmentT),
    g: Math.round(c1.g + (c2.g - c1.g) * segmentT),
    b: Math.round(c1.b + (c2.b - c1.b) * segmentT),
  };
}

export default function AppleIntelligenceGlow() {
  const { isTranslating } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hideTimerRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isTranslating) {
      setVisible(true);
      startTimeRef.current = performance.now();
      
      // Clear any existing hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      
      // Hide after 7 seconds
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, 7000);
    }
  }, [isTranslating]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const drawGlow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const time = (performance.now() - startTimeRef.current) / 1000;

    ctx.clearRect(0, 0, width, height);

    const borderRadius = 50;
    const padding = 0; // No padding - edge of viewport
    
    const innerLeft = padding;
    const innerTop = padding;
    const innerRight = width - padding;
    const innerBottom = height - padding;
    const innerWidth = innerRight - innerLeft;
    const innerHeight = innerBottom - innerTop;

    // Get point on rounded rectangle perimeter
    const getPointOnRoundedRect = (progress: number): { x: number; y: number } => {
      const perimeter = 2 * (innerWidth - 2 * borderRadius) + 2 * (innerHeight - 2 * borderRadius) + 2 * Math.PI * borderRadius;
      const topEdge = innerWidth - 2 * borderRadius;
      const rightEdge = innerHeight - 2 * borderRadius;
      const bottomEdge = innerWidth - 2 * borderRadius;
      const leftEdge = innerHeight - 2 * borderRadius;
      const cornerArc = (Math.PI * borderRadius) / 2;

      let dist = progress * perimeter;

      // Top-left corner
      if (dist < cornerArc) {
        const angle = Math.PI + (dist / borderRadius);
        return {
          x: innerLeft + borderRadius + Math.cos(angle) * borderRadius,
          y: innerTop + borderRadius + Math.sin(angle) * borderRadius,
        };
      }
      dist -= cornerArc;

      // Top edge
      if (dist < topEdge) {
        return { x: innerLeft + borderRadius + dist, y: innerTop };
      }
      dist -= topEdge;

      // Top-right corner
      if (dist < cornerArc) {
        const angle = -Math.PI / 2 + (dist / borderRadius);
        return {
          x: innerRight - borderRadius + Math.cos(angle) * borderRadius,
          y: innerTop + borderRadius + Math.sin(angle) * borderRadius,
        };
      }
      dist -= cornerArc;

      // Right edge
      if (dist < rightEdge) {
        return { x: innerRight, y: innerTop + borderRadius + dist };
      }
      dist -= rightEdge;

      // Bottom-right corner
      if (dist < cornerArc) {
        const angle = 0 + (dist / borderRadius);
        return {
          x: innerRight - borderRadius + Math.cos(angle) * borderRadius,
          y: innerBottom - borderRadius + Math.sin(angle) * borderRadius,
        };
      }
      dist -= cornerArc;

      // Bottom edge
      if (dist < bottomEdge) {
        return { x: innerRight - borderRadius - dist, y: innerBottom };
      }
      dist -= bottomEdge;

      // Bottom-left corner
      if (dist < cornerArc) {
        const angle = Math.PI / 2 + (dist / borderRadius);
        return {
          x: innerLeft + borderRadius + Math.cos(angle) * borderRadius,
          y: innerBottom - borderRadius + Math.sin(angle) * borderRadius,
        };
      }
      dist -= cornerArc;

      // Left edge
      return { x: innerLeft, y: innerBottom - borderRadius - dist };
    };

    // Draw layers (inside glow - toward center)
    LAYER_CONFIGS.forEach((layer, layerIndex) => {
      const points = 180;
      const colorOffset = (time * layer.speedMultiplier * 0.3) % 1;
      
      // For coverage < 1, only draw part of the perimeter (comet effect)
      const startOffset = (time * layer.speedMultiplier * 0.2) % 1;
      const coveragePoints = Math.floor(points * layer.coverage);

      for (let i = 0; i < coveragePoints; i++) {
        const progress = ((i / points) + startOffset) % 1;
        const point = getPointOnRoundedRect(progress);
        
        const colorT = ((i / coveragePoints) + colorOffset) % 1;
        const color = interpolateColors(layer.colors, colorT);

        // Calculate direction toward center for inside glow
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - point.x;
        const dy = centerY - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;

        // Offset glow toward inside
        const glowX = point.x + nx * (layer.glowSize / 2);
        const glowY = point.y + ny * (layer.glowSize / 2);

        const gradient = ctx.createRadialGradient(
          glowX, glowY, 0,
          glowX, glowY, layer.glowSize
        );
        
        // Fade effect for comet tail
        let pointOpacity = layer.opacity;
        if (layer.coverage < 1) {
          pointOpacity *= (i / coveragePoints); // Fade from tail to head
        }
        
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${pointOpacity})`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${pointOpacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(glowX, glowY, layer.glowSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    animationRef.current = requestAnimationFrame(drawGlow);
  }, []);

  useEffect(() => {
    if (visible && canvasRef.current) {
      drawGlow();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible, drawGlow]);

  if (!mounted || !visible) return null;

  const overflow = 20; // px за край viewport

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      style={{
        opacity: isTranslating ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: -overflow,
          left: -overflow,
          width: `calc(100% + ${overflow * 2}px)`,
          height: `calc(100% + ${overflow * 2}px)`,
          filter: 'blur(4px)',
        }}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
