'use client';

import React, { useCallback, useRef, useState } from 'react';

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;
      const file = files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onFile(file);
      }
    },
    [onFile, disabled],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload video or audio file"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '52px 40px',
        borderRadius: '16px',
        border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-hi)'}`,
        background: dragOver
          ? 'var(--accent-glow)'
          : 'var(--bg-surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxShadow: dragOver
          ? '0 0 0 4px var(--accent-glow), inset 0 0 40px var(--accent-glow)'
          : 'none',
        animation: !dragOver && !disabled ? 'pulse-border 3s ease-in-out infinite' : 'none',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        width: '100%',
        maxWidth: '540px',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: dragOver ? 'var(--accent-glow)' : 'var(--bg-raised)',
          border: `1.5px solid ${dragOver ? 'var(--accent)' : 'var(--border-hi)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          style={{ color: dragOver ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.2s' }}
        >
          <path
            d="M14 3L14 18M14 3L9 8M14 3L19 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 20V23C4 24.1046 4.89543 25 6 25H22C23.1046 25 24 24.1046 24 23V20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '17px',
            fontWeight: 700,
            color: dragOver ? 'var(--accent)' : 'var(--text-primary)',
            transition: 'color 0.2s',
            letterSpacing: '-0.01em',
          }}
        >
          {dragOver ? 'Drop to upload' : 'Drop your video here'}
        </p>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          or click to browse your files
        </p>
      </div>

      {/* Format pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['MP4', 'MOV', 'WebM', 'MP3', 'M4A'].map((fmt) => (
          <span
            key={fmt}
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              padding: '3px 9px',
              borderRadius: '4px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
            }}
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
