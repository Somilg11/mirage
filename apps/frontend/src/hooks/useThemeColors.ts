import { useMemo } from 'react';
import { useTheme } from '../providers/ThemeProvider';

const TOKENS = ['yes', 'no', 'primary', 'border', 'fg-muted', 'fg-subtle', 'surface', 'fg'] as const;
type Token = (typeof TOKENS)[number];

/** Resolved CSS token values for libraries (e.g. SVG charts) that cannot consume CSS variables. */
export function useThemeColors(): Record<Token, string> {
  const { theme } = useTheme();
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(TOKENS.map(t => [t, styles.getPropertyValue(`--${t}`).trim()])) as Record<Token, string>;
    // Recompute when the theme attribute changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}
