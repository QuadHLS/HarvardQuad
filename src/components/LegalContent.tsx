import React from 'react';

interface LegalContentProps {
  text: string;
}

export function LegalContent({ text }: LegalContentProps) {
  return (
    <pre className="whitespace-pre-wrap font-sans text-inherit">
      {text}
    </pre>
  );
}
