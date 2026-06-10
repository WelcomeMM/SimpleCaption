import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

export const Beasty: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
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
          gap: '0.15em',
          padding: '0 6%',
        }}
      >
        {tokens.map((tok, i) => {
          const isActive = timeMs >= tok.fromMs && timeMs < tok.toMs;
          const word = style.uppercase ? tok.text.toUpperCase() : tok.text;
          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 900,
                display: 'inline-block',
                color: isActive ? style.highlightColor : style.textColor,
                WebkitTextStroke: `${style.strokeWidth}px ${style.strokeColor}`,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                transformOrigin: 'center bottom',
                transition: 'transform 0.06s ease, color 0.06s ease',
                lineHeight: 1.1,
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
