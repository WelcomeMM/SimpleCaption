'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Caption } from '@remotion/captions';

interface TranscriptEditorProps {
  captions: Caption[];
  onChange: (c: Caption[]) => void;
}

function rebuildCaptions(newText: string, captions: Caption[]): Caption[] {
  const words = newText.trim().split(/\s+/).filter(Boolean);

  // Clearing the transcript must be honored (otherwise the render keeps old words).
  if (words.length === 0) return [];
  if (captions.length === 0) return captions;

  if (words.length === captions.length) {
    // Common case: typo fix — keep timing, replace text
    return captions.map((c, i) => ({
      ...c,
      text: (i === 0 ? '' : ' ') + words[i],
    }));
  }

  // Word count changed — redistribute evenly across original span
  const startMs = captions[0].startMs;
  const endMs = captions[captions.length - 1].endMs;
  const dur = Math.max(1, endMs - startMs);
  const step = dur / words.length;

  return words.map((w, i) => ({
    text: (i === 0 ? '' : ' ') + w,
    startMs: Math.round(startMs + i * step),
    endMs: Math.round(startMs + (i + 1) * step),
    timestampMs: Math.round(startMs + (i + 0.5) * step),
    confidence: 1,
  }));
}

export default function TranscriptEditor({ captions, onChange }: TranscriptEditorProps) {
  const textValue = captions.map((c) => c.text).join('').trim();
  const [localText, setLocalText] = useState(textValue);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external caption changes (e.g., job loaded) into local state
  useEffect(() => {
    setLocalText(captions.map((c) => c.text).join('').trim());
    setIsDirty(false);
  }, [captions]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setLocalText(val);
      setIsDirty(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = rebuildCaptions(val, captions);
        onChange(next);
        setIsDirty(false);
      }, 600);
    },
    [captions, onChange],
  );

  // Flush on blur immediately
  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = rebuildCaptions(localText, captions);
    onChange(next);
    setIsDirty(false);
  }, [localText, captions, onChange]);

  // Derive from the live text so the count updates immediately while typing.
  const wordCount = localText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Textarea */}
      <div
        style={{
          position: 'relative',
          borderRadius: '10px',
          background: 'var(--bg-raised)',
          border: `1.5px solid ${isDirty ? 'var(--accent)40' : 'var(--border)'}`,
          transition: 'border-color 0.15s ease',
          overflow: 'hidden',
        }}
      >
        <textarea
          value={localText}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={5}
          placeholder="Transcript will appear here once transcription is complete…"
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            lineHeight: 1.7,
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 300,
            outline: 'none',
            display: 'block',
          }}
        />
        {isDirty && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-dim)',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          Fix any wrong words — timing stays in sync.
        </p>
        <span
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '10px',
            color: 'var(--text-dim)',
            whiteSpace: 'nowrap',
          }}
        >
          {wordCount} words
        </span>
      </div>
    </div>
  );
}
