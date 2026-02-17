import { useMemo } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { COLORS_DARK, COLORS_LIGHT, type ThemeColors } from '../constants';

export function useTheme(): ThemeColors {
  const darkMode = useSettingsStore((s) => s.darkMode);
  return useMemo(() => (darkMode ? COLORS_DARK : COLORS_LIGHT), [darkMode]);
}
