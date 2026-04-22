'use client';

import * as React from 'react';
import { Moon, Palette, Sun, Check } from 'lucide-react';
import { useResolvedAppearance, useCustomTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher() {
  const { appearance, setAppearance } = useResolvedAppearance();
  const { theme, setTheme } = useCustomTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setAppearance('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {appearance === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAppearance('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {appearance === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Theme Color</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('madras')}>
          <span className="mr-2 flex h-4 w-4 shrink-0 rounded-full bg-[#E3001B]" />
          Madras (Red)
          {theme === 'madras' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('ocean')}>
          <span className="mr-2 flex h-4 w-4 shrink-0 rounded-full bg-[#2563EB]" />
          Ocean (Blue)
          {theme === 'ocean' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('emerald')}>
          <span className="mr-2 flex h-4 w-4 shrink-0 rounded-full bg-[#059669]" />
          Emerald (Green)
          {theme === 'emerald' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
