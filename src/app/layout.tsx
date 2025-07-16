import type { Metadata } from 'next';
import './globals.css';
import { DEFAULT_COMPANY_NAME } from '@/lib/localStorage';
import Providers from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

// Metadata is now correctly exported from a Server Component.
export const metadata: Metadata = {
  title: {
    default: DEFAULT_COMPANY_NAME,
    template: `%s | ${DEFAULT_COMPANY_NAME}`,
  },
  description: 'Advanced Invoice Management System.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The html tag is now managed by the Providers component to avoid hydration mismatches
    <Providers>
        {children}
        <Toaster />
    </Providers>
  );
}
