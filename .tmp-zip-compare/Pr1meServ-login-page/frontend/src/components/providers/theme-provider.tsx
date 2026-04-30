'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

export type CustomTheme = 'madras' | 'ocean' | 'emerald';

interface CustomThemeContextValue {
  theme: CustomTheme;
  setTheme: (theme: CustomTheme) => void;
}

const THEME_STORAGE_KEY = 'a1prime-custom-theme';
const DEFAULT_THEME: CustomTheme = 'madras';

const CustomThemeContext = React.createContext<CustomThemeContextValue | null>(null);

function applyCustomTheme(theme: CustomTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', theme);
}

function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeState, setThemeState] = React.useState<CustomTheme>(DEFAULT_THEME);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as CustomTheme | null;
    const nextTheme =
      storedTheme === 'madras' || storedTheme === 'ocean' || storedTheme === 'emerald'
        ? storedTheme
        : DEFAULT_THEME;

    setThemeState(nextTheme);
    applyCustomTheme(nextTheme);
  }, []);

  const setTheme = React.useCallback((theme: CustomTheme) => {
    setThemeState(theme);
    applyCustomTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      theme: themeState,
      setTheme,
    }),
    [themeState, setTheme],
  );

  return <CustomThemeContext.Provider value={value}>{children}</CustomThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <CustomThemeProvider>{children}</CustomThemeProvider>
    </NextThemesProvider>
  );
}

export function useCustomTheme() {
  const context = React.useContext(CustomThemeContext);

  if (!context) {
    throw new Error('useCustomTheme must be used within ThemeProvider.');
  }

  return context;
}

export function useResolvedAppearance() {
  const { resolvedTheme, setTheme } = useTheme();
  const appearance = resolvedTheme === 'dark' ? 'dark' : 'light';

  return {
    appearance,
    setAppearance: setTheme,
    toggleAppearance: () => setTheme(appearance === 'dark' ? 'light' : 'dark'),
  };
}
