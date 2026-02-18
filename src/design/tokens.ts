import { Platform } from 'react-native';

// ─── Spacing (4-point grid) ───────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Typography ───────────────────────────────────────────────────
const FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const TYPOGRAPHY = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
  },
} as const;

// ─── Border Radius ────────────────────────────────────────────────
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows (iOS-style) ─────────────────────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────
export const ANIMATION = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  quick: {
    duration: 200,
  },
  medium: {
    duration: 350,
  },
} as const;

// ─── Component Sizes ──────────────────────────────────────────────
export const SIZES = {
  tabBarHeight: 49,
  headerHeight: 44,
  buttonHeight: 50,
  inputHeight: 44,
  dotSize: 8,
  iconSizeSm: 16,
  iconSizeMd: 24,
  iconSizeLg: 32,
  pttButtonSize: 88,
  pttOuterRing: 100,
} as const;
