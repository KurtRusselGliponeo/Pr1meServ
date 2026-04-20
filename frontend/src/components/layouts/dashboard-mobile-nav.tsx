'use client';

import * as React from 'react';
import { PanelLeftOpen } from 'lucide-react';

import { NavigationList } from '@/components/layouts/dashboard-sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DashboardMobileNav() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="lg:hidden">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-white/50 bg-background/70 shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-background/70"
            aria-label="Open navigation menu"
          >
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full max-w-[88vw] translate-x-0 translate-y-0 rounded-none border-r border-white/40 bg-transparent p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left dark:border-white/10">
          <div className="flex h-full flex-col bg-sidebar/95 backdrop-blur-xl">
            <div className="border-b border-white/40 bg-brand-gradient-soft px-6 py-5 dark:border-white/10">
              <DialogTitle className="text-left text-xl">Branch Workspace</DialogTitle>
              <DialogDescription className="mt-2 text-left">
                Choose a workspace area and keep your current task flow intact.
              </DialogDescription>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <NavigationList onNavigate={() => setIsOpen(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

