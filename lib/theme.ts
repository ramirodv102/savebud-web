// SaveBud design tokens — single source of truth for all visual decisions

export const colors = {
  // Backgrounds
  background: '#F5F1E8',    // warm off-white (main app bg)
  surface: '#FFFFFF',
  surfaceAlt: '#EDE9E0',    // slightly darker bg for inner cards

  // Brand
  primary: '#0F3D2E',       // deep green (headers, active states)
  primaryLight: '#1A5C45',  // lighter green for hover/active

  // Ink
  ink: '#1A1F1A',
  inkMuted: '#6B7068',
  inkFaint: '#A8ADA6',

  // Semantic alerts
  warning: '#C8A248',       // gold — soft warning (80–100% of budget)
  alert: '#E07A4F',         // warm orange — strong warning (>100% category)
  error: '#D94F3D',         // red — total budget exceeded

  // Utility
  border: '#DDD9CF',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  // Font family keys — loaded via expo-font in _layout.tsx
  display: 'Fraunces_400Regular',
  displayBold: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_400Regular_Italic',
  body: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodySemibold: 'Geist_600SemiBold',

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 32,
    hero: 52,   // remaining budget number on dashboard
  },
} as const;

// Shadow presets (iOS shadowProps + Android elevation)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

const theme = { colors, spacing, radius, typography, shadows };
export default theme;
