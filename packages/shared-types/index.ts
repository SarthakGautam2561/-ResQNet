// ResQNet Shared Types
// Used by both Mobile App and Dashboard

// ── SOS Categories ──────────────────────────────────────────
export const SOS_CATEGORIES = [
  'Medical Emergency',
  'Rescue Needed',
  'Food / Water',
  'Fire',
  'Missing Person',
  'Women Safety',
  'Shelter Needed',
  'Other',
] as const;

export type SOSCategory = (typeof SOS_CATEGORIES)[number];

// Category colors used across apps
export const CATEGORY_COLORS: Record<SOSCategory, string> = {
  'Medical Emergency': '#ef4444',
  'Rescue Needed': '#f97316',
  'Food / Water': '#eab308',
  'Fire': '#dc2626',
  'Missing Person': '#8b5cf6',
  'Women Safety': '#ec4899',
  'Shelter Needed': '#06b6d4',
  'Other': '#94a3b8',
};

// ── Severity Levels ─────────────────────────────────────────
export const SEVERITY_LEVELS = {
  1: { label: 'Low', color: '#3b82f6' },
  2: { label: 'Moderate', color: '#06b6d4' },
  3: { label: 'Important', color: '#eab308' },
  4: { label: 'High', color: '#f97316' },
  5: { label: 'Critical', color: '#ef4444' },
} as const;

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Important',
  4: 'High',
  5: 'Critical',
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  1: '#3b82f6',
  2: '#06b6d4',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

export const SEVERITY_BG_COLORS: Record<SeverityLevel, string> = {
  1: '#1e3a5f',
  2: '#164e63',
  3: '#713f12',
  4: '#7c2d12',
  5: '#7f1d1d',
};

// ── Status ──────────────────────────────────────────────────
export const SOS_STATUSES = ['pending', 'processed', 'in_progress', 'resolved'] as const;
export type SOSStatus = (typeof SOS_STATUSES)[number];

// ── User Roles ──────────────────────────────────────────────
export const USER_ROLES = ['admin', 'official', 'ngo', 'volunteer', 'public'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ── Database Models ─────────────────────────────────────────
export interface SOSReport {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  category: SOSCategory;
  severity: SeverityLevel;
  message: string | null;
  status: SOSStatus;
  assigned_to: string | null;
  source_device: string | null;
  synced_at: string | null;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  contact: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Offline Queue Types (Mobile Only) ───────────────────────
export interface QueuedSOSReport {
  id: string; // client-generated UUID
  name: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  category: SOSCategory;
  severity: SeverityLevel;
  message: string | null;
  created_at: string;
  source_device: string;
  synced: boolean;
  retry_count: number;
}

// ── Category Icons (emoji mapping) ──────────────────────────
export const CATEGORY_ICONS: Record<SOSCategory, string> = {
  'Medical Emergency': '🏥',
  'Rescue Needed': '🆘',
  'Food / Water': '🍞',
  'Fire': '🔥',
  'Missing Person': '🔍',
  'Women Safety': '🛡️',
  'Shelter Needed': '🏠',
  'Other': '⚠️',
};

// ── Marker Colors by Severity ───────────────────────────────
export const MARKER_COLORS: Record<SeverityLevel, string> = {
  1: '#3b82f6', // Blue - Low
  2: '#06b6d4', // Cyan - Moderate
  3: '#eab308', // Yellow - Important
  4: '#f97316', // Orange - High
  5: '#ef4444', // Red - Critical
};
