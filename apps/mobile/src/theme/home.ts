import { Dimensions } from 'react-native';

// The visual language introduced on the Home screen: one gutter, one rhythm,
// one radius, one surface/border pair. Screens that sit next to Home in the tab
// bar import these instead of re-declaring their own near-miss values.

const { width } = Dimensions.get('window');

export const GUTTER = 20;
export const GAP = 12;
export const SECTION_GAP = 28;
export const CARD_WIDTH = width - GUTTER * 2;
export const RADIUS = 20;

export const SURFACE = '#141416';
export const SURFACE_BORDER = '#232326';
export const SURFACE_INSET = '#1D1D21';
export const TRACK = '#26262A';
export const TEXT = '#FFFFFF';
export const TEXT_MUTED = '#9CA3AF';
export const TEXT_FAINT = '#6B7280';

export const GRADIENT: [string, string] = ['#69EAC0', '#40C9FF'];

export const ACCENT = '#69EAC0';
export const ACCENT_TINT = 'rgba(105, 234, 192, 0.12)';

export const SUBJECT_COLORS: Record<string, string> = {
  physics: '#60A5FA',
  chemistry: '#F59E0B',
  maths: '#A78BFA',
};
