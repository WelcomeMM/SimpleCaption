'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Dropzone from '@/components/Dropzone';

type UploadState = 'idle' | 'uploading' | 'transcribing' | 'error';

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

const FEATURES = [
  { icon: '◈', label: 'Free forever' },
  { icon: '◉', label: 'No watermark' },
  { icon: '◆', label: 'Word-by-word animation' },
  { icon: '◇', label: '5 caption styles' },
];

export default function Home() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [language, setLanguage] = useState('auto');

  const handleFile = useCallback(
    async (file: File) => {
      setUploadState('uploading');
      setFileName(file.name);
      setErrorMsg('');

      try {
        // Step 1: upload
        const form = new FormData();
        form.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}));
          throw new Error(body.error ?? `Upload failed (${uploadRes.status})`);
        }
        const { jobId } = await uploadRes.json();

        // Step 2: start transcription
        setUploadState('transcribing');
        const txRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, language }),
        });
        if (!txRes.ok) {
          const body = await txRes.json().catch(() => ({}));
          throw new Error(body.error ?? `Transcription start failed (${txRes.status})`);
        }

        // Step 3: navigate — editor handles the wait
        router.push(`/editor/${jobId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.';
        setErrorMsg(msg);
        setUploadState('error');
      }
    },
    [router, language],
  );

  const isDisabled = uploadState === 'uploading' || uploadState === 'transcribing';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '300px',
          background:
            'radial-gradient(ellipse at center, rgba(245,166,35,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '40px',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        {/* Logo / wordmark */}
        <div
          className="animate-fade-up"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', animationDelay: '0ms' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Logo mark */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--accent)" opacity="0.15" />
              <rect x="1" y="1" width="30" height="30" rx="7.5" stroke="var(--accent)" strokeOpacity="0.3" strokeWidth="1" />
              <path d="M8 10H24M8 16H20M8 22H16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(28px, 5vw, 38px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              Simple<span style={{ color: 'var(--accent)' }}>Caption</span>
            </h1>
          </div>
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 17px)',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: 1.55,
              maxWidth: '420px',
              fontWeight: 300,
            }}
          >
            Add animated captions to your videos.{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              Free. No watermark. No limits.
            </span>
          </p>
        </div>

        {/* Dropzone area */}
        <div
          className="animate-fade-up"
          style={{ width: '100%', animationDelay: '80ms' }}
        >
          <Dropzone onFile={handleFile} disabled={isDisabled} />
        </div>

        {/* Language selector */}
        <div
          className="animate-fade-up"
          style={{ width: '100%', animationDelay: '120ms' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="language-select"
              style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.02em' }}
            >
              Spoken language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isDisabled}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 400,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '32px',
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              {LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Leave on Auto-detect unless results look wrong.
            </p>
          </div>
        </div>

        {/* Upload state indicator */}
        {(uploadState === 'uploading' || uploadState === 'transcribing') && (
          <div
            className="animate-fade-up"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hi)',
              width: '100%',
            }}
          >
            <svg
              className="animate-spin-slow"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              style={{ color: 'var(--accent)', flexShrink: 0 }}
            >
              <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
              <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {uploadState === 'uploading' ? `Uploading ${fileName}…` : 'Starting transcription…'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {uploadState === 'uploading'
                  ? 'Sending file to server'
                  : 'Taking you to the editor'}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {uploadState === 'error' && errorMsg && (
          <div
            className="animate-fade-up"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px 20px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              width: '100%',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#f87171' }}>Upload failed</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Feature pills */}
        <div
          className="animate-fade-up"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            animationDelay: '160ms',
          }}
        >
          {FEATURES.map(({ icon, label }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontWeight: 400,
                letterSpacing: '0.01em',
              }}
            >
              <span style={{ color: 'var(--accent)', fontSize: '10px' }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
