import React, { useMemo } from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';
import type { CaptionedVideoProps } from '@/lib/types';
import { buildPages, TEMPLATES } from './templates';

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
        : <OffthreadVideo src={props.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const durationInFrames = Math.max(1, Math.round((page.durationMs / 1000) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames}>
            <Template text={page.text} tokens={page.tokens} timeMs={timeMs} style={props.style} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
