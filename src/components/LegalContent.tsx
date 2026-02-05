import React from 'react';

/**
 * Renders legal page text with section/subsection spacing and indentation:
 * - "1.", "2." … = section header (bold, extra top margin)
 * - "A.", "B." … = subsection header (medium weight, slight indent)
 * - "•" = bullet (indent)
 * - "o" = sub-bullet (more indent)
 */
export function LegalContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="text-[#27251f] text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trimEnd();
        const key = `${i}-${trimmed.slice(0, 20)}`;
        if (trimmed === '') {
          return <div key={key} className="h-3" aria-hidden />;
        }
        // Numbered section (e.g. "1. INTRODUCTION")
        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <h2 key={key} className="font-semibold text-[#27251f] mt-6 first:mt-0">
              {trimmed}
            </h2>
          );
        }
        // Letter subsection (e.g. "A. Information You Provide")
        if (/^[A-Z]\.\s+/.test(trimmed)) {
          return (
            <h3 key={key} className="font-medium text-[#27251f] mt-4 pl-2">
              {trimmed}
            </h3>
          );
        }
        // Bullet (•)
        if (/^•\s/.test(trimmed)) {
          return (
            <p key={key} className="pl-4 mt-1 text-[#27251f]">
              {trimmed}
            </p>
          );
        }
        // Sub-bullet (o)
        if (/^o\s/.test(trimmed)) {
          return (
            <p key={key} className="pl-6 mt-0.5 text-[#27251f]/90">
              {trimmed}
            </p>
          );
        }
        // Normal paragraph
        return (
          <p key={key} className="mt-1 text-[#27251f]">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
