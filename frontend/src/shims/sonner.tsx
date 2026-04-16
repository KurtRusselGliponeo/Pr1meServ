'use client';

import * as React from 'react';

type ToastVariant = 'error' | 'success' | 'message';

function emitToast(variant: ToastVariant, message: string, description?: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app-toast', {
      detail: {
        id: `${variant}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        variant,
        message,
        description,
      },
    });

    window.dispatchEvent(event);
  }
}

export const toast = {
  error(message: string) {
    emitToast('error', message);
  },
  success(message: string, options?: { description?: string }) {
    emitToast('success', message, options?.description);
  },
  message(message: string, options?: { description?: string }) {
    emitToast('message', message, options?.description);
  },
};

export function Toaster(_props: Record<string, unknown>) {
  const [items, setItems] = React.useState<
    Array<{ id: string; variant: ToastVariant; message: string; description?: string }>
  >([]);

  React.useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<{
        id: string;
        variant: ToastVariant;
        message: string;
        description?: string;
      }>;
      setItems((current) => [...current, customEvent.detail]);
    }

    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  React.useEffect(() => {
    if (!items.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setItems((current) => current.slice(1));
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [items]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl border px-4 py-3 shadow-lg ${
            item.variant === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : item.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-border bg-background text-foreground'
          }`}
        >
          <p className="text-sm font-medium">{item.message}</p>
          {item.description ? <p className="mt-1 text-xs opacity-80">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}
