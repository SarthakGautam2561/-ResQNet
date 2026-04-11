import {
  SOS_CATEGORIES as SHARED_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  SEVERITY_LEVELS as SHARED_SEVERITY_LEVELS,
  SEVERITY_BG_COLORS,
  type SOSCategory,
  type SeverityLevel,
} from '@resqnet/shared-types';

const CATEGORY_LABELS: Record<SOSCategory, string> = {
  'Medical Emergency': 'Medical',
  'Rescue Needed': 'Rescue',
  'Food / Water': 'Food/Water',
  'Fire': 'Fire',
  'Missing Person': 'Missing',
  'Women Safety': 'Safety',
  'Shelter Needed': 'Shelter',
  'Other': 'Other',
};

export const SOS_CATEGORIES = SHARED_CATEGORIES.map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  icon: CATEGORY_ICONS[key],
  color: CATEGORY_COLORS[key],
})) as const;

const SEVERITY_LEVEL_ORDER: SeverityLevel[] = [1, 2, 3, 4, 5];

export const SEVERITY_LEVELS = SEVERITY_LEVEL_ORDER.map((level) => ({
  level,
  label: SHARED_SEVERITY_LEVELS[level].label,
  color: SHARED_SEVERITY_LEVELS[level].color,
  bgColor: SEVERITY_BG_COLORS[level],
}));
