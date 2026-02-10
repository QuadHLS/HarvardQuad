/**
 * Morphing dots typing indicator — matches original HTML/CSS exactly:
 * .typing-indicator: flex, gap 8px, padding 20px 30px, rgba(255,255,255,0.1), blur(10px), border-radius 50px, box-shadow
 * .dot: 12px, 50%, #fff, animation morph 1.4s infinite ease-in-out, delays 0s / 0.2s / 0.4s
 * @keyframes morph: 0%/100% scale(1) translateY(0) #fff | 25% scale(1.5) translateY(-10px) #ffd700 | 50% scale(1) translateY(0) #ff6b9d
 * Scaled so pill height = 44px (single-row message bubble); ratio preserved.
 */
import React from 'react';

export interface TypingIndicatorProps {
  /** Optional label, e.g. "John is typing" */
  label?: string;
  className?: string;
}

// Original: padding 20px 30px, dots 12px, gap 8px → height 52px. Scale to 44px: k = 44/52
const K = 44 / 52;
const PAD_V = Math.round(20 * K);   // 17
const PAD_H = Math.round(30 * K);   // 25
const DOT = Math.round(12 * K);     // 10
const GAP = Math.round(8 * K);      // 7
const TRANSLATE_Y = Math.round(-10 * K); // -8

export function TypingIndicator({ label, className = '' }: TypingIndicatorProps) {
  return (
    <div
      className={`flex items-center ${className}`}
      style={{ width: 'fit-content', gap: label ? 10 : 0 }}
    >
      <div
        className="typing-indicator-pill"
        style={{
          display: 'flex',
          gap: GAP,
          alignItems: 'center',
          padding: `${PAD_V}px ${PAD_H}px`,
          height: 44,
          boxSizing: 'border-box',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '50px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <span className="typing-dot" style={{ animationDelay: '0s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
      {label && (
        <span className="text-xs font-medium" style={{ color: '#787771' }}>
          {label}
        </span>
      )}
      <style>{`
        .typing-indicator-pill .typing-dot {
          width: ${DOT}px;
          height: ${DOT}px;
          border-radius: 50%;
          background: #fff;
          animation: typing-morph 1.4s infinite ease-in-out;
          flex-shrink: 0;
        }
        @keyframes typing-morph {
          0%, 100% {
            transform: scale(1) translateY(0);
            background: #fff;
          }
          25% {
            transform: scale(1.5) translateY(${TRANSLATE_Y}px);
            background: #ffd700;
          }
          50% {
            transform: scale(1) translateY(0);
            background: #ff6b9d;
          }
        }
      `}</style>
    </div>
  );
}
