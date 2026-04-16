import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      suppressHydrationWarning
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full rounded-2xl border border-white/55 bg-background/88 px-4 py-3 text-sm text-foreground shadow-soft transition-all duration-300 ease-smooth outline-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
