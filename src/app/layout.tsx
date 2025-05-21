
"use client";

import type { Metadata } from 'next'; // Keep for potential static metadata
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
import { useEffect, useState, useCallback } from 'react'; // Added useState, useEffect, useCallback

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Static metadata can still be defined
export const metadataBase: Metadata = {
  title: 'Quanti Analytics',
  description: 'Advanced Analytics Dashboard.',
};

export const THEME_STORAGE_KEY = 'app-theme';
export const AVAILABLE_THEMES = {
  'quanti-dark': 'Quanti Dark (Default)',
  'oceanic-blue': 'Oceanic Blue',
  // Add more themes here as 'key': 'Display Name'
};
export const DEFAULT_THEME_KEY = 'quanti-dark';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentThemeKey, setCurrentThemeKey] = useState<string>(DEFAULT_THEME_KEY);

  const applyTheme = useCallback((themeKey: string) => {
    const htmlElement = document.documentElement;
    // Remove any existing theme attributes to prevent conflicts
    Object.keys(AVAILABLE_THEMES).forEach(key => {
      htmlElement.removeAttribute(`data-theme-${key}`); // Clean up old way if any
    });
    htmlElement.setAttribute('data-theme', themeKey);
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    setCurrentThemeKey(themeKey);
  }, []);

  useEffect(() => {
    // On initial load, try to get theme from localStorage or use default
    const storedThemeKey = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedThemeKey && AVAILABLE_THEMES[storedThemeKey as keyof typeof AVAILABLE_THEMES]) {
      applyTheme(storedThemeKey);
    } else {
      applyTheme(DEFAULT_THEME_KEY);
    }
  }, [applyTheme]);

  // Listen for theme changes from other tabs/windows (optional but good practice)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        if (AVAILABLE_THEMES[event.newValue as keyof typeof AVAILABLE_THEMES]) {
          applyTheme(event.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [applyTheme]);


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* You can spread metadataBase if needed, or set title directly */}
        <title>{String(metadataBase.title)}</title>
        <meta name="description" content={String(metadataBase.description)} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen>
          <Sidebar variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground hidden md:flex border-r border-sidebar-border">
            <SidebarHeader className="p-3 border-b border-sidebar-border">
              <div className="px-1 py-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden">
                <h1 className="text-xl font-semibold text-sidebar-primary-foreground">Quanti Analytics</h1>
              </div>
              <div className="p-1 text-center group-[[data-state=collapsed]]:block group-[[data-state=expanded]]:hidden">
                 <svg className="h-6 w-6 mx-auto text-sidebar-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
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

          <div className="flex flex-col flex-1">
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

            <SidebarInset className="bg-background"> {/* Ensures main content area also gets theme background */}
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
