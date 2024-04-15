import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';

import { siteConfig } from '@/lib/config';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'bg-muted flex max-h-dvh min-h-dvh flex-col',
          GeistSans.className
        )}
      >
        {children}
      </body>
    </html>
  );
}
