import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Video,
  Audio,
  Sequence,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from 'remotion';
import type { CaptionedVideoProps } from '@/lib/types';
import { buildPages, TEMPLATES } from './templates';

// Each new caption page fades in over this many frames so page switches
// don't feel like an abrupt flash.
const FADE_IN_FRAMES = 4;

function PageFadeIn({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame(); // relative to Sequence start = 0 at page entry
  const opacity = interpolate(frame, [0, FADE_IN_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export const CaptionedVideo: React.FC<CaptionedVideoProps> = (props) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const timeMs = (frame / fps) * 1000;
  const Template = TEMPLATES[props.template];
  const pages = useMemo(
    () => buildPages(props.captions, props.style.maxWordsPerPage),
    [props.captions, props.style.maxWordsPerPage],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: props.backgroundColor }}>
      {props.isAudioOnly
        ? <Audio src={props.src} />
        : <Video src={props.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const durationInFrames = Math.max(1, Math.round((page.durationMs / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <PageFadeIn>
              <Template text={page.text} tokens={page.tokens} timeMs={timeMs} style={props.style} />
            </PageFadeIn>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
