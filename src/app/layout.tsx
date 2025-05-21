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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlayIcon, PlusIcon, SearchIcon } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CreatioLookAlike', // Updated title
  description: 'Lead and Opportunity Management.',
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
          {/* Sidebar */}
          <Sidebar variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground hidden md:flex border-r border-sidebar-border">
            <SidebarHeader className="p-2 border-b border-sidebar-border">
              {/* Sidebar Search */}
              <div className="px-2 py-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden">
                <Input 
                  type="search" 
                  placeholder="Search..." 
                  className="h-9 bg-sidebar-background border-sidebar-border placeholder:text-sidebar-foreground/60 focus:bg-sidebar-accent"
                />
              </div>
               <div className="p-2 text-center group-[[data-state=collapsed]]:block group-[[data-state=expanded]]:hidden">
                <SearchIcon className="h-5 w-5 mx-auto text-sidebar-foreground/80" />
              </div>
            </SidebarHeader>
            <SidebarContent className="flex-1 mt-2">
              <AppNav />
            </SidebarContent>
            {/* Optional Sidebar Footer can be added here */}
          </Sidebar>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-transparent bg-[hsl(var(--header-background))] px-4 text-header-foreground shadow-sm sm:px-6">
              <SidebarTrigger className="text-header-foreground hover:bg-white/10 md:hidden" />
              <Link href="/dashboard" className="flex items-center gap-2 mr-4" title="Creatio Home">
                <AppLogo />
                <h1 className="font-semibold text-lg text-header-foreground hidden sm:block">
                  Creatio
                </h1>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-white/10">
                  <PlayIcon className="h-5 w-5" />
                   <span className="sr-only">Play</span>
                </Button>
                 <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-white/10">
                  <PlusIcon className="h-5 w-5" />
                   <span className="sr-only">Add</span>
                </Button>
              </div>

              <div className="flex-1 flex justify-center px-4">
                <div className="w-full max-w-md">
                  <Input 
                    type="search" 
                    placeholder="Search..." 
                    className="h-9 bg-white/10 border-none text-header-foreground placeholder:text-header-foreground/70 focus:bg-white/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Placeholder for other header icons if needed */}
                <UserNav />
              </div>
            </header>

            {/* Page Content */}
            <SidebarInset className="bg-background"> {/* Ensures inset takes remaining space */}
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
