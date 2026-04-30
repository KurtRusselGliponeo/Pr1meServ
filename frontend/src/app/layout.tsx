import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: {
    default: 'A1 Prime Branch Management System',
    template: '%s | A1 Prime — PRU Life UK',
  },
  description:
    'PRU Life UK A1 Prime Branch Management & Agent Performance System — COSAF, Lapsation, KPI Monitoring',
  keywords: ['PRU Life UK', 'A1 Prime', 'Insurance', 'COSAF', 'Agent Performance'],
  openGraph: {
    title: 'A1 Prime Branch Management System',
    description: 'PRU Life UK A1 Prime Branch Management & Agent Performance System',
    url: 'https://a1prime.example.com',
    siteName: 'A1 Prime',
    locale: 'en_PH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A1 Prime Branch Management System',
    description: 'PRU Life UK A1 Prime Branch Management & Agent Performance System',
  },
};

import { PwaRegistration } from '@/components/providers/pwa-registration';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <body className="font-sans antialiased">
        <PwaRegistration />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
