import type { Caption } from '@remotion/captions';

export type TemplateId = 'hormozi' | 'beasty' | 'clean' | 'karaoke' | 'neon';

export type CaptionPosition = 'top' | 'middle' | 'bottom';

export interface StyleProps {
  fontFamily: string;
  fontSize: number;          // px at composition scale
  position: CaptionPosition;
  textColor: string;         // hex
  highlightColor: string;    // hex (active word / box)
  strokeColor: string;       // hex
  strokeWidth: number;       // px
  uppercase: boolean;
  maxWordsPerPage: number;   // grouping size
}

export interface CaptionedVideoProps {
  src: string;               // URL the Player/renderer can load
  isAudioOnly: boolean;
  captions: Caption[];
  template: TemplateId;
  style: StyleProps;
  backgroundColor: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

export type JobStatus =
  | 'uploaded'
  | 'transcribing'
  | 'ready'
  | 'rendering'
  | 'done'
  | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  sourceFile: string;        // absolute path
  sourceExt: string;
  isAudioOnly: boolean;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  captions: Caption[];
  renderProgress: number;    // 0..1
  outputFile?: string;
  error?: string;            // fatal (transcription) error
  renderError?: string;      // render-only failure; job stays usable
  createdAt: number;
}
