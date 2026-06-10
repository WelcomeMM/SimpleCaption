'use client';

import type { StyleProps, CaptionPosition } from '@/lib/types';

interface StyleControlsProps {
  style: StyleProps;
  onChange: (s: StyleProps) => void;
  isAudioOnly: boolean;
  backgroundColor: string;
  onBackgroundChange: (c: string) => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}
    >
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        padding: '7px 10px',
        borderRadius: '8px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        flex: 1,
        minWidth: 0,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border-hi)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)'; }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '5px',
          background: value,
          border: '1.5px solid rgba(255,255,255,0.12)',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </label>
  );
}

const POSITIONS: { value: CaptionPosition; label: string }[] = [
  { value: 'top',    label: 'Top' },
  { value: 'middle', label: 'Mid' },
  { value: 'bottom', label: 'Bot' },
];

export default function StyleControls({
  style,
  onChange,
  isAudioOnly,
  backgroundColor,
  onBackgroundChange,
}: StyleControlsProps) {
  const update = <K extends keyof StyleProps>(key: K, val: StyleProps[K]) =>
    onChange({ ...style, [key]: val });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Font size */}
      <Row label="Font size">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={32}
            max={160}
            step={2}
            value={style.fontSize}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              color: 'var(--accent)',
              minWidth: '36px',
              textAlign: 'right',
            }}
          >
            {style.fontSize}
          </span>
        </div>
      </Row>

      {/* Position */}
      <Row label="Position">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
            background: 'var(--bg-raised)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          {POSITIONS.map(({ value, label }) => {
            const isActive = style.position === value;
            return (
              <button
                key={value}
                onClick={() => update('position', value)}
                style={{
                  padding: '6px 0',
                  borderRadius: '5px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Row>

      {/* Colors */}
      <Row label="Colors">
        <div style={{ display: 'flex', gap: '6px' }}>
          <ColorSwatch label="Text" value={style.textColor} onChange={(v) => update('textColor', v)} />
          <ColorSwatch label="Highlight" value={style.highlightColor} onChange={(v) => update('highlightColor', v)} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <ColorSwatch label="Stroke" value={style.strokeColor} onChange={(v) => update('strokeColor', v)} />
          {isAudioOnly && (
            <ColorSwatch label="Background" value={backgroundColor} onChange={onBackgroundChange} />
          )}
        </div>
      </Row>

      {/* Stroke width */}
      <Row label="Stroke width">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={0}
            max={16}
            step={1}
            value={style.strokeWidth}
            onChange={(e) => update('strokeWidth', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              color: 'var(--accent)',
              minWidth: '28px',
              textAlign: 'right',
            }}
          >
            {style.strokeWidth}
          </span>
        </div>
      </Row>

      {/* Words per line */}
      <Row label="Words per line">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={style.maxWordsPerPage}
            onChange={(e) => update('maxWordsPerPage', Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              color: 'var(--accent)',
              minWidth: '28px',
              textAlign: 'right',
            }}
          >
            {style.maxWordsPerPage}
          </span>
        </div>
      </Row>

      {/* Uppercase toggle */}
      <Row label="Text transform">
        <button
          onClick={() => update('uppercase', !style.uppercase)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '8px',
            background: style.uppercase ? 'var(--accent-glow)' : 'var(--bg-raised)',
            border: `1.5px solid ${style.uppercase ? 'var(--accent)40' : 'var(--border)'}`,
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '12px',
              color: style.uppercase ? 'var(--accent)' : 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}
          >
            UPPERCASE
          </span>
          {/* Toggle pill */}
          <div
            style={{
              width: 36,
              height: 20,
              borderRadius: '999px',
              background: style.uppercase ? 'var(--accent)' : 'var(--bg-hover)',
              border: '1px solid transparent',
              position: 'relative',
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: style.uppercase ? '18px' : '2px',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: style.uppercase ? '#000' : 'var(--text-dim)',
                transition: 'left 0.15s ease',
              }}
            />
          </div>
        </button>
      </Row>
    </div>
  );
}
