import type { ComponentType } from 'react';
import type { StyleProps } from '@/lib/types';

export interface TemplatePageProps {
  text: string;
  tokens: { text: string; fromMs: number; toMs: number }[];
  timeMs: number;          // current time within composition, in ms
  style: StyleProps;
}
export type TemplateComponent = ComponentType<TemplatePageProps>;
