import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

export const Karaoke: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
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
          padding: '0 8%',
        }}
      >
        {tokens.map((tok, i) => {
          const isActive = timeMs >= tok.fromMs && timeMs < tok.toMs;
          const isPast = tok.toMs <= timeMs;
          const word = style.uppercase ? tok.text.toUpperCase() : tok.text;
          const lit = isActive || isPast;
          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 800,
                display: 'inline-block',
                color: lit ? style.highlightColor : style.textColor,
                WebkitTextStroke: `${style.strokeWidth}px ${style.strokeColor}`,
                transition: 'color 0.05s ease',
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
