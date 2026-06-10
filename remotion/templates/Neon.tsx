import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

const FADE_MS = 70;

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

          let progress: number;
          if (isActive) {
            progress = interpolate(timeMs - tok.fromMs, [0, FADE_MS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          } else {
            progress = 0;
          }

          const scale = 1 + 0.1 * progress;
          // Glow intensifies as the word becomes active
          const baseGlow = `0 0 12px ${style.highlightColor}, 0 0 24px ${style.highlightColor}`;
          const activeGlow = `0 0 8px ${style.highlightColor}, 0 0 20px ${style.highlightColor}, 0 0 40px ${style.highlightColor}`;
          const glow = progress > 0 ? activeGlow : baseGlow;

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
                paintOrder: 'stroke',
                strokeLinejoin: 'round',
                textShadow: glow,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
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
