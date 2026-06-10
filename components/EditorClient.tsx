'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Caption } from '@remotion/captions';
import type { TemplateId, StyleProps, Job } from '@/lib/types';
import { DEFAULT_STYLES } from '@/remotion/captionStyles';
import { CaptionedVideo } from '@/remotion/CaptionedVideo';
import TemplatePicker from '@/components/TemplatePicker';
import StyleControls from '@/components/StyleControls';
import TranscriptEditor from '@/components/TranscriptEditor';

// Player MUST be client-only — OffthreadVideo throws if SSR'd with no src
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = dynamic<any>(
  () => import('@remotion/player').then((m) => m.Player),
  { ssr: false },
);

interface Props {
  jobId: string;
}

type RenderState = 'idle' | 'rendering' | 'done' | 'error';

const POLL_INTERVAL_MS = 1200;
const RENDER_POLL_MS = 1000;

function Spinner({ size = 18, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <svg
      className="animate-spin-slow"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      style={{ color, flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
      {children}
    </section>
  );
}

export default function EditorClient({ jobId }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const [template, setTemplate] = useState<TemplateId>('hormozi');
  const [style, setStyle] = useState<StyleProps>(DEFAULT_STYLES.hormozi);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const renderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll job status until ready ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error ?? `Job fetch failed (${res.status})`);
        }
        const data: Job = await res.json();
        if (cancelled) return;

        setJob(data);

        if (data.status === 'ready' || data.status === 'done' || data.status === 'rendering') {
          // Transcription finished — load captions once, then stop the job poll.
          // (During 'rendering' the dedicated render poller tracks progress.)
          setCaptions(data.captions ?? []);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setPollError(err instanceof Error ? err.message : 'Failed to load job');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  // ── Template change also resets style ──────────────────────────────────
  const handleTemplateChange = useCallback((t: TemplateId) => {
    setTemplate(t);
    setStyle(DEFAULT_STYLES[t]);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  const startRender = useCallback(async () => {
    setRenderState('rendering');
    setRenderProgress(0);
    setRenderError(null);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, template, style, captions, backgroundColor }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Render start failed (${res.status})`);
      }
    } catch (err: unknown) {
      setRenderState('error');
      setRenderError(err instanceof Error ? err.message : 'Render failed');
      return;
    }

    // Poll render progress
    renderPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/render/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setRenderProgress(data.renderProgress ?? 0);
        if (data.status === 'done') {
          setRenderState('done');
          setRenderProgress(1);
          if (renderPollRef.current) clearInterval(renderPollRef.current);
        } else if (data.error) {
          // Render failed; job itself stays usable (status back to 'ready').
          setRenderState('error');
          setRenderError(data.error ?? 'Render failed');
          if (renderPollRef.current) clearInterval(renderPollRef.current);
        }
      } catch {
        // keep polling
      }
    }, RENDER_POLL_MS);
  }, [jobId, template, style, captions, backgroundColor]);

  useEffect(() => {
    return () => {
      if (renderPollRef.current) clearInterval(renderPollRef.current);
    };
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const isReady = job?.status === 'ready' || job?.status === 'done' || job?.status === 'rendering';
  const isTranscribing =
    !job || job.status === 'uploaded' || job.status === 'transcribing';
  const isJobError = job?.status === 'error';

  const durationInFrames =
    job && isReady
      ? Math.max(1, Math.round(job.durationInSeconds * job.fps))
      : 1;

  // Aspect ratio for the player container
  const aspectRatio =
    job && isReady && job.width && job.height ? job.width / job.height : 9 / 16;
  const isPortrait = aspectRatio < 1;

  // ── Loading / error states ───────────────────────────────────────────────
  if (pollError) {
    return (
      <CenteredMessage>
        <ErrorCard message={pollError} />
      </CenteredMessage>
    );
  }

  if (isJobError && job) {
    return (
      <CenteredMessage>
        <ErrorCard message={job.error ?? 'An error occurred'} />
      </CenteredMessage>
    );
  }

  if (isTranscribing) {
    return (
      <CenteredMessage>
        <TranscribingState />
      </CenteredMessage>
    );
  }

  // ── Editor ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-void)',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '52px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: '16px',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--accent)" opacity="0.15" />
            <path d="M8 10H24M8 16H20M8 22H16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span
            className="font-display"
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Simple<span style={{ color: 'var(--accent)' }}>Caption</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: '10px',
              color: 'var(--text-dim)',
              letterSpacing: '0.05em',
              display: 'none',
            }}
            className="sm-show"
          >
            {jobId.slice(0, 8)}…
          </span>
          {job?.status === 'ready' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#22c55e',
                }}
              />
              <span
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '10px',
                  color: '#22c55e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Ready
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Editor body */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '0',
          overflow: 'hidden',
        }}
        className="editor-grid"
      >
        {/* Left: Player */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0D0D10',
            padding: '32px',
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          {isReady && job ? (
            <div
              style={{
                aspectRatio: String(aspectRatio),
                // Anchor one dimension definitely so aspect-ratio can resolve;
                // otherwise the Player falls back to the composition's native size.
                height: isPortrait ? 'min(80vh, 100%)' : 'auto',
                width: isPortrait ? 'auto' : 'min(100%, calc(80vh * ' + aspectRatio + '))',
                maxHeight: '80vh',
                maxWidth: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <Player
                component={CaptionedVideo}
                inputProps={{
                  src: `/api/source/${jobId}`,
                  isAudioOnly: job.isAudioOnly,
                  captions,
                  template,
                  style,
                  backgroundColor,
                  width: job.width,
                  height: job.height,
                  fps: job.fps,
                  durationInFrames,
                }}
                durationInFrames={durationInFrames}
                fps={job.fps}
                compositionWidth={job.width}
                compositionHeight={job.height}
                style={{ width: '100%', height: '100%' }}
                controls
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '200px',
              }}
            >
              <Spinner size={32} />
            </div>
          )}
        </div>

        {/* Right: Controls panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* Scrollable controls area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <PanelSection title="Template">
              <TemplatePicker value={template} onChange={handleTemplateChange} />
            </PanelSection>

            <PanelSection title="Style">
              <StyleControls
                style={style}
                onChange={setStyle}
                isAudioOnly={job?.isAudioOnly ?? false}
                backgroundColor={backgroundColor}
                onBackgroundChange={setBackgroundColor}
              />
            </PanelSection>

            <PanelSection title="Transcript">
              <TranscriptEditor captions={captions} onChange={setCaptions} />
            </PanelSection>
          </div>

          {/* Sticky render button */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {renderState === 'idle' && (
              <button
                onClick={startRender}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '10px',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 2L13 8L3 14V2Z" fill="currentColor" />
                </svg>
                Render &amp; Download
              </button>
            )}

            {renderState === 'rendering' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Spinner size={14} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rendering…</span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '11px',
                      color: 'var(--accent)',
                    }}
                  >
                    {Math.round(renderProgress * 100)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--bg-raised)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(renderProgress * 100)}%`,
                      background: 'var(--accent)',
                      borderRadius: '2px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {renderState === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href={`/api/download/${jobId}`}
                  download
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1.5px solid rgba(34, 197, 94, 0.4)',
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Download MP4
                </a>
                <button
                  onClick={() => { setRenderState('idle'); setRenderProgress(0); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    padding: '4px',
                    textAlign: 'center',
                    width: '100%',
                    outline: 'none',
                  }}
                >
                  Re-render with different settings
                </button>
              </div>
            )}

            {renderState === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    fontSize: '12px',
                    color: '#f87171',
                    lineHeight: 1.4,
                  }}
                >
                  {renderError ?? 'Render failed'}
                </div>
                <button
                  onClick={() => { setRenderState('idle'); setRenderError(null); }}
                  style={{
                    width: '100%',
                    padding: '11px 20px',
                    borderRadius: '10px',
                    background: 'var(--bg-raised)',
                    border: '1.5px solid var(--border-hi)',
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .editor-grid {
            grid-template-columns: 1fr !important;
            overflow: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-void)',
      }}
    >
      {children}
    </div>
  );
}

function TranscribingState() {
  return (
    <div
      className="animate-fade-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '48px 32px',
        borderRadius: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {/* Animated icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--accent-glow)',
          border: '2px solid var(--accent)30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size={28} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          Transcribing your audio
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Whisper is extracting every word.
          <br />
          This usually takes 20–60 seconds.
        </p>
      </div>
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse-border 1.4s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '40px 32px',
        borderRadius: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid rgba(239,68,68,0.25)',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          border: '1.5px solid rgba(239,68,68,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9.5" stroke="#f87171" strokeWidth="1.5" />
          <path d="M11 7v4.5M11 14.5v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Something went wrong
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>
      </div>
      <Link
        href="/"
        style={{
          padding: '10px 24px',
          borderRadius: '8px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-hi)',
          fontSize: '13px',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
