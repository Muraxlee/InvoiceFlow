
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
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧾</text></svg>',
  },
  // Adding preconnect links for Google Fonts
  other: {
    preconnect: [
      { href: "https://fonts.googleapis.com" },
      { href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }
    ]
  }
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
