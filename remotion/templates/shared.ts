import type { CSSProperties } from 'react';
import type { StyleProps } from '@/lib/types';

export function positionStyle(s: StyleProps): CSSProperties {
  const justify = s.position === 'top' ? 'flex-start'
    : s.position === 'middle' ? 'center' : 'flex-end';
  const pad = s.position === 'bottom' ? { paddingBottom: '12%' }
    : s.position === 'top' ? { paddingTop: '12%' } : {};
  return { justifyContent: justify, alignItems: 'center', ...pad };
}
