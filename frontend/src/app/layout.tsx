import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import '@/styles/globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'A1 Prime Branch Management System',
    template: '%s | A1 Prime — PRU Life UK',
  },
  description:
    'PRU Life UK A1 Prime Branch Management & Agent Performance System — COSAF, Lapsation, KPI Monitoring',
  keywords: ['PRU Life UK', 'A1 Prime', 'Insurance', 'COSAF', 'Agent Performance'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
