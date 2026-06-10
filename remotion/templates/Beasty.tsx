import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

const FADE_MS = 60;

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

          let progress: number;
          if (isActive) {
            progress = interpolate(timeMs - tok.fromMs, [0, FADE_MS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          } else if (timeMs >= tok.toMs) {
            progress = interpolate(timeMs - tok.toMs, [0, FADE_MS], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          } else {
            progress = 0;
          }

          const scale = 1 + 0.15 * progress;

          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 900,
                display: 'inline-block',
                color: progress > 0 ? style.highlightColor : style.textColor,
                WebkitTextStroke: `${style.strokeWidth}px ${style.strokeColor}`,
                paintOrder: 'stroke',
                strokeLinejoin: 'round',
                transform: `scale(${scale})`,
                transformOrigin: 'center bottom',
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
