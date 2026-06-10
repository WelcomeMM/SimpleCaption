import type { TemplateId } from '@/lib/types';
import type { TemplateComponent } from './types';
import { Hormozi } from './Hormozi';
import { Beasty } from './Beasty';
import { Clean } from './Clean';
import { Karaoke } from './Karaoke';
import { Neon } from './Neon';

export type { TemplateComponent, TemplatePageProps } from './types';
export { buildPages, type CaptionPage } from './pages';

export const TEMPLATES: Record<TemplateId, TemplateComponent> = {
  hormozi: Hormozi, beasty: Beasty, clean: Clean, karaoke: Karaoke, neon: Neon,
};
export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  hormozi: 'Hormozi', beasty: 'Beasty', clean: 'Clean', karaoke: 'Karaoke', neon: 'Neon',
};
