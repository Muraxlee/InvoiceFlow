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
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Quanti Analytics', 
  description: 'Advanced Analytics Dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SidebarProvider defaultOpen>
          {/* Sidebar */}
          <Sidebar variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground hidden md:flex border-r border-sidebar-border">
            <SidebarHeader className="p-3 border-b border-sidebar-border">
              {/* App Title */}
              <div className="px-1 py-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden">
                <h1 className="text-xl font-semibold text-sidebar-primary-foreground">Quanti Analytics</h1>
              </div>
              <div className="p-1 text-center group-[[data-state=collapsed]]:block group-[[data-state=expanded]]:hidden">
                <SearchIcon className="h-5 w-5 mx-auto text-sidebar-foreground/80" /> {/* Placeholder for collapsed logo */}
              </div>
              {/* Sidebar Search */}
              <div className="mt-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden">
                <Input 
                  type="search" 
                  placeholder="Search..." 
                  className="h-9 bg-input border-sidebar-border placeholder:text-muted-foreground focus:bg-sidebar-accent text-sm"
                />
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1 mt-2">
              <AppNav />
            </SidebarContent>
          </Sidebar>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-header px-4 text-header-foreground shadow-sm sm:px-6">
              <SidebarTrigger className="text-header-foreground hover:bg-accent/10 md:hidden" />
              
              <div className="flex-1 flex justify-center px-4">
                <div className="w-full max-w-md relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search anything..." 
                    className="h-9 bg-input border-border pl-10 text-foreground placeholder:text-muted-foreground focus:bg-accent/10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UserNav />
              </div>
            </header>

            <SidebarInset className="bg-background">
              <main className="flex-1 p-4 sm:p-6 md:p-8">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
