'use client';

import type { TemplateId } from '@/lib/types';
import { TEMPLATE_LABELS } from '@/remotion/templates';
import { DEFAULT_STYLES } from '@/remotion/captionStyles';

interface TemplatePickerProps {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}

// Each template gets a characteristic accent drawn from its highlight color
const TEMPLATE_META: Record<TemplateId, { accent: string; tagline: string }> = {
  hormozi: { accent: '#FFE600', tagline: 'Bold yellow pop' },
  beasty:  { accent: '#00E0FF', tagline: 'Cyber cyan' },
  clean:   { accent: '#FFFFFF', tagline: 'Minimal white' },
  karaoke: { accent: '#22E07A', tagline: 'Green karaoke' },
  neon:    { accent: '#FF2EF7', tagline: 'Neon magenta' },
};

export default function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const ids = Object.keys(TEMPLATE_LABELS) as TemplateId[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ids.map((id) => {
        const isActive = id === value;
        const meta = TEMPLATE_META[id];
        const style = DEFAULT_STYLES[id];

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1.5px solid ${isActive ? meta.accent + '60' : 'var(--border)'}`,
              background: isActive
                ? `linear-gradient(135deg, ${meta.accent}10 0%, transparent 60%), var(--bg-raised)`
                : 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              width: '100%',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hi)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              }
            }}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: meta.accent,
                  borderRadius: '10px 0 0 10px',
                }}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: isActive ? '8px' : '4px' }}>
              {/* Color swatch */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  background: `linear-gradient(135deg, #111 0%, #1a1a1a 100%)`,
                  border: `1.5px solid ${meta.accent}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '9px',
                    fontWeight: 600,
                    color: meta.accent,
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {id.slice(0, 2)}
                </span>
                {/* Dot accent */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 3,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: meta.accent,
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {TEMPLATE_LABELS[id]}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: isActive ? meta.accent + 'CC' : 'var(--text-dim)',
                    marginTop: '2px',
                    lineHeight: 1,
                  }}
                >
                  {meta.tagline}
                </p>
              </div>
            </div>

            {/* Style preview badges */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {style.uppercase && (
                <span
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    background: isActive ? meta.accent + '20' : 'var(--bg-raised)',
                    color: isActive ? meta.accent : 'var(--text-dim)',
                    letterSpacing: '0.06em',
                    border: `1px solid ${isActive ? meta.accent + '30' : 'transparent'}`,
                  }}
                >
                  CAPS
                </span>
              )}
              {isActive && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke={meta.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
