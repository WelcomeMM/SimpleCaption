import React from 'react';
import { Composition } from 'remotion';
import { CaptionedVideo } from './CaptionedVideo';
import type { CaptionedVideoProps } from '@/lib/types';
import { DEFAULT_STYLES } from './captionStyles';

const defaultProps: CaptionedVideoProps = {
  src: '', isAudioOnly: false, captions: [], template: 'hormozi',
  style: DEFAULT_STYLES.hormozi, backgroundColor: '#000000',
  width: 1080, height: 1920, fps: 30, durationInFrames: 30,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CaptionedVideo"
    component={CaptionedVideo as unknown as React.ComponentType<Record<string, unknown>>}
    durationInFrames={30}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps as unknown as Record<string, unknown>}
    calculateMetadata={({ props }: { props: Record<string, unknown>; defaultProps: Record<string, unknown>; abortSignal: AbortSignal; compositionId: string; isRendering: boolean }) => {
      const p = props as unknown as CaptionedVideoProps;
      return {
        width: p.width,
        height: p.height,
        fps: p.fps,
        durationInFrames: p.durationInFrames,
      };
    }}
  />
);
