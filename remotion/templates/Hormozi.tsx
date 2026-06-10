import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { TemplatePageProps } from './types';
import { positionStyle } from './shared';

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
          return (
            <span
              key={i}
              style={{
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: 900,
                display: 'inline-block',
                padding: isActive ? '0.05em 0.2em' : undefined,
                borderRadius: isActive ? '0.2em' : undefined,
                backgroundColor: isActive ? style.highlightColor : 'transparent',
                color: isActive ? '#000000' : style.textColor,
                WebkitTextStroke: isActive
                  ? 'none'
                  : `${style.strokeWidth}px ${style.strokeColor}`,
                paintOrder: isActive ? undefined : 'stroke',
                strokeLinejoin: isActive ? undefined : 'round',
                transform: isActive ? 'scale(1.06)' : 'scale(1)',
                transformOrigin: 'center center',
                transition: 'transform 0.08s ease, background-color 0.08s ease',
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
