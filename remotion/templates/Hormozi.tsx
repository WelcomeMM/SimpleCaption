import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

const FADE_MS = 80;

export const Hormozi: React.FC<TemplatePageProps> = ({ tokens, timeMs, style }) => {
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

          // Fade in when the word becomes active; snap to inactive once it ends.
          // Past words snap off immediately so only one word animates at a time.
          let progress: number;
          if (isActive) {
            progress = interpolate(timeMs - tok.fromMs, [0, FADE_MS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          } else {
            progress = 0;
          }

          const scale = 1 + 0.06 * progress;

          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 900,
                display: 'inline-block',
                padding: progress > 0 ? '0.05em 0.2em' : undefined,
                borderRadius: progress > 0 ? '0.2em' : undefined,
                backgroundColor: progress > 0 ? style.highlightColor : 'transparent',
                color: progress > 0 ? '#000000' : style.textColor,
                WebkitTextStroke: progress > 0
                  ? 'none'
                  : `${style.strokeWidth}px ${style.strokeColor}`,
                paintOrder: progress > 0 ? undefined : 'stroke',
                strokeLinejoin: progress > 0 ? undefined : 'round',
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
