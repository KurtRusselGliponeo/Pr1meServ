'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

type BrandTheme = 'madras' | 'burgundy';

interface BrandThemeContextValue {
  brandTheme: BrandTheme;
  setBrandTheme: (theme: BrandTheme) => void;
  toggleBrandTheme: () => void;
}

const BRAND_STORAGE_KEY = 'a1prime-brand-theme';
const DEFAULT_BRAND_THEME: BrandTheme = 'madras';

const BrandThemeContext = React.createContext<BrandThemeContextValue | null>(null);

function applyBrandTheme(theme: BrandTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-brand', theme);
}

function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const [brandTheme, setBrandThemeState] = React.useState<BrandTheme>(DEFAULT_BRAND_THEME);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(BRAND_STORAGE_KEY) as BrandTheme | null;
    const nextTheme =
      storedTheme === 'madras' || storedTheme === 'burgundy' ? storedTheme : DEFAULT_BRAND_THEME;

    setBrandThemeState(nextTheme);
    applyBrandTheme(nextTheme);
  }, []);

  const setBrandTheme = React.useCallback((theme: BrandTheme) => {
    setBrandThemeState(theme);
    applyBrandTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BRAND_STORAGE_KEY, theme);
    }
  }, []);

  const toggleBrandTheme = React.useCallback(() => {
    setBrandTheme(brandTheme === 'madras' ? 'burgundy' : 'madras');
  }, [brandTheme, setBrandTheme]);

  const value = React.useMemo(
    () => ({
      brandTheme,
      setBrandTheme,
      toggleBrandTheme,
    }),
    [brandTheme, setBrandTheme, toggleBrandTheme],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <BrandThemeProvider>{children}</BrandThemeProvider>
    </NextThemesProvider>
  );
}

export function useBrandTheme() {
  const context = React.useContext(BrandThemeContext);

  if (!context) {
    throw new Error('useBrandTheme must be used within ThemeProvider.');
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
