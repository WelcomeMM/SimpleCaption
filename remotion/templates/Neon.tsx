import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

export const Neon: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...positionStyle(style),
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.2em',
          padding: '0 8%',
        }}
      >
        {tokens.map((tok, i) => {
          const isActive = timeMs >= tok.fromMs && timeMs < tok.toMs;
          const word = style.uppercase ? tok.text.toUpperCase() : tok.text;
          const glow = isActive
            ? `0 0 8px ${style.highlightColor}, 0 0 20px ${style.highlightColor}, 0 0 40px ${style.highlightColor}`
            : `0 0 12px ${style.highlightColor}, 0 0 24px ${style.highlightColor}`;
          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 800,
                display: 'inline-block',
                color: style.textColor,
                WebkitTextStroke: `${style.strokeWidth}px ${style.strokeColor}`,
                textShadow: glow,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transformOrigin: 'center center',
                transition: 'transform 0.07s ease, text-shadow 0.07s ease',
                lineHeight: 1.15,
                whiteSpace: 'pre',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
