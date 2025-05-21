import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { AppNav } from '@/components/app-nav';
import { UserNav } from '@/components/user-nav';
import Link from 'next/link';
import { AppLogo } from '@/components/app-logo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'InvoiceFlow',
  description: 'Efficiently manage your invoices and sales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen>
          <Sidebar variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground hidden md:flex">
            <SidebarHeader className="p-4 border-b border-sidebar-border">
              <Link href="/dashboard" className="flex items-center gap-2" title="InvoiceFlow Home">
                <AppLogo />
                <h1 className="font-semibold text-lg text-sidebar-foreground group-[[data-state=collapsed]]:hidden">
                  InvoiceFlow
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent className="flex-1">
              <AppNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/90 px-4 shadow-sm backdrop-blur-md sm:px-6">
              <SidebarTrigger className="text-foreground" />
              <div className="flex-1">
                {/* Breadcrumbs or dynamic page title can be added here */}
              </div>
              <UserNav />
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
