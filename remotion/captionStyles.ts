import type { StyleProps, TemplateId } from '@/lib/types';

export const DEFAULT_STYLES: Record<TemplateId, StyleProps> = {
  hormozi: { fontFamily: 'Inter, sans-serif', fontSize: 90, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FFE600', strokeColor: '#000000',
    strokeWidth: 8, uppercase: true, maxWordsPerPage: 3 },
  beasty: { fontFamily: 'Inter, sans-serif', fontSize: 96, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#00E0FF', strokeColor: '#000000',
    strokeWidth: 10, uppercase: true, maxWordsPerPage: 4 },
  clean: { fontFamily: 'Inter, sans-serif', fontSize: 64, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#FFFFFF', strokeColor: '#000000',
    strokeWidth: 0, uppercase: false, maxWordsPerPage: 6 },
  karaoke: { fontFamily: 'Inter, sans-serif', fontSize: 72, position: 'bottom',
    textColor: '#FFFFFF', highlightColor: '#22E07A', strokeColor: '#000000',
    strokeWidth: 4, uppercase: false, maxWordsPerPage: 5 },
  neon: { fontFamily: 'Inter, sans-serif', fontSize: 88, position: 'middle',
    textColor: '#FFFFFF', highlightColor: '#FF2EF7', strokeColor: '#2A00FF',
    strokeWidth: 4, uppercase: true, maxWordsPerPage: 3 },
};

export function defaultStyle(t: TemplateId): StyleProps { return DEFAULT_STYLES[t]; }
