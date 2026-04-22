import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-smooth outline-none select-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-float active:bg-primary/95',
        outline:
          'border border-input bg-background/78 text-foreground shadow-soft backdrop-blur-sm hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 active:bg-accent/80',
        secondary:
          'bg-secondary/90 text-secondary-foreground shadow-soft hover:-translate-y-0.5 hover:bg-secondary aria-expanded:bg-secondary active:bg-secondary/80',
        ghost:
          'text-muted-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground dark:hover:bg-white/10 active:bg-accent/80',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:-translate-y-0.5 hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 active:bg-destructive/95',
        link: 'text-primary underline-offset-4 hover:underline active:text-primary/80',
      },
      size: {
        default:
          'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: 'h-7 gap-1.5 rounded-full px-3 text-xs [&_svg:not([class*=size-])]:size-3',
        sm: 'h-9 gap-1.5 rounded-full px-3.5 text-[0.82rem] [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-12 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10 rounded-full',
        'icon-xs': 'size-7 rounded-full [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-8 rounded-full',
        'icon-lg': 'size-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      suppressHydrationWarning
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
