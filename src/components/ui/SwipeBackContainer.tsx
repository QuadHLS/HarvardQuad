import React, { useEffect, useRef, useState } from 'react';

interface SwipeBackContainerProps {
  children?: React.ReactNode;
  onBack: () => void;
  className?: string;
  style?: React.CSSProperties;
  enabled?: boolean;
  edgeActivationWidth?: number;
  completeThresholdRatio?: number;
  requireEdgeStart?: boolean;
}

export function SwipeBackContainer({
  children,
  onBack,
  className,
  style,
  enabled = true,
  edgeActivationWidth = 32,
  completeThresholdRatio = 0.28,
  requireEdgeStart = true,
}: SwipeBackContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const currentOffsetXRef = useRef(0);
  const isTrackingRef = useRef(false);
  const hasLockedDirectionRef = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimatingBack, setIsAnimatingBack] = useState(false);

  const resetSwipe = () => {
    setIsAnimatingBack(true);
    setOffsetX(0);
    currentOffsetXRef.current = 0;
    window.setTimeout(() => setIsAnimatingBack(false), 180);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;
      const el = containerRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target || !el.contains(target)) return;

      const touch = e.touches[0];
      const shouldTrack = requireEdgeStart ? touch.clientX <= edgeActivationWidth : true;
      isTrackingRef.current = shouldTrack;
      hasLockedDirectionRef.current = false;
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      currentOffsetXRef.current = 0;
      if (shouldTrack) {
        setIsAnimatingBack(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!enabled || !isTrackingRef.current || e.touches.length !== 1) return;
      const el = containerRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target || !el.contains(target)) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartXRef.current;
      const dy = touch.clientY - touchStartYRef.current;

      if (!hasLockedDirectionRef.current) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        hasLockedDirectionRef.current = true;
        if (Math.abs(dx) <= Math.abs(dy)) {
          isTrackingRef.current = false;
          return;
        }
      }

      if (dx <= 0) {
        setOffsetX(0);
        return;
      }

      // In iOS WKWebView (Capacitor), this must be non-passive to stop vertical scroll
      // from taking over once we commit to a horizontal edge swipe.
      e.preventDefault();
      const maxDrag = window.innerWidth * 0.85;
      const nextOffset = Math.min(dx, maxDrag);
      currentOffsetXRef.current = nextOffset;
      setOffsetX(nextOffset);
    };

    const handleTouchEnd = () => {
      if (!enabled || !isTrackingRef.current) return;
      isTrackingRef.current = false;
      hasLockedDirectionRef.current = false;

      const threshold = window.innerWidth * completeThresholdRatio;
      const shouldGoBack = currentOffsetXRef.current >= threshold;
      if (shouldGoBack) {
        onBack();
        setOffsetX(0);
        currentOffsetXRef.current = 0;
        setIsAnimatingBack(false);
        return;
      }
      resetSwipe();
    };

    // Use window-level capture listeners to avoid nested scroll areas swallowing touches in WKWebView.
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { capture: true });
    window.addEventListener('touchcancel', handleTouchEnd, { capture: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
  }, [enabled, edgeActivationWidth, completeThresholdRatio, onBack, requireEdgeStart]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        touchAction: 'pan-y',
        transform: offsetX > 0 ? `translateX(${Math.round(offsetX)}px)` : style?.transform,
        transition: isAnimatingBack ? 'transform 180ms ease-out' : undefined,
        boxShadow: offsetX > 0 ? '-12px 0 30px rgba(0,0,0,0.08)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
