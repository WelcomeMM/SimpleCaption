import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

const FADE_MS = 80;

export const Clean: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
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
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.1em',
          padding: '0.4em 0.7em',
          background: 'rgba(0,0,0,0.45)',
          borderRadius: 16,
          backdropFilter: 'blur(2px)',
          margin: '0 8%',
        }}
      >
        {tokens.map((tok, i) => {
          const isActive = timeMs >= tok.fromMs && timeMs < tok.toMs;
          const word = style.uppercase ? tok.text.toUpperCase() : tok.text;

          let opacity: number;
          if (isActive) {
            opacity = interpolate(timeMs - tok.fromMs, [0, FADE_MS], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          } else {
            opacity = 0.7;
          }

          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 700,
                display: 'inline-block',
                color: style.textColor,
                opacity,
                lineHeight: 1.2,
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
