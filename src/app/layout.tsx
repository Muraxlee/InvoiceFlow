
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
import { useEffect, useState, useCallback } from 'react'; 
import { loadFromLocalStorage, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME } from '@/lib/localStorage';
import { Building2 } from 'lucide-react'; // Using a generic building icon

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
  title: 'Dynamic Company App', // Will be updated dynamically if companyName is set
  description: 'Advanced Analytics Dashboard.',
};

export const THEME_STORAGE_KEY = 'app-theme';
export const AVAILABLE_THEMES = {
  'quanti-dark': 'Quanti Dark (Default)',
  'oceanic-blue': 'Oceanic Blue',
  'crimson-peak': 'Crimson Peak (Dark Red)',
  'forest-whisper': 'Forest Whisper (Dark Green)',
  'midnight-purple': 'Midnight Purple (Dark Purple)',
  'daybreak-classic': 'Daybreak Classic (Light Blue)',
  'minty-fresh': 'Minty Fresh (Light Green)',
  'sunny-citrus': 'Sunny Citrus (Light Orange)',
  'high-contrast-dark': 'High Contrast Dark',
  'high-contrast-light': 'High Contrast Light',
};
export const DEFAULT_THEME_KEY = 'quanti-dark';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentThemeKey, setCurrentThemeKey] = useState<string>(DEFAULT_THEME_KEY);
  const [companyName, setCompanyName] = useState<string>(DEFAULT_COMPANY_NAME);
  const [companyInitial, setCompanyInitial] = useState<string>(DEFAULT_COMPANY_NAME.substring(0,1).toUpperCase());

  const applyTheme = useCallback((themeKey: string) => {
    const htmlElement = document.documentElement;
    Object.keys(AVAILABLE_THEMES).forEach(key => {
      htmlElement.removeAttribute(`data-theme-${key}`); 
    });
    htmlElement.setAttribute('data-theme', themeKey);
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    setCurrentThemeKey(themeKey);
  }, []);

  useEffect(() => {
    const storedThemeKey = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedThemeKey && AVAILABLE_THEMES[storedThemeKey as keyof typeof AVAILABLE_THEMES]) {
      applyTheme(storedThemeKey);
    } else {
      applyTheme(DEFAULT_THEME_KEY);
    }

    const storedCompanyName = loadFromLocalStorage<string>(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME);
    setCompanyName(storedCompanyName);
    setCompanyInitial(storedCompanyName.substring(0,1).toUpperCase() || 'Q');
    if (document) {
        document.title = storedCompanyName;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        if (AVAILABLE_THEMES[event.newValue as keyof typeof AVAILABLE_THEMES]) {
          applyTheme(event.newValue);
        }
      }
      if (event.key === COMPANY_NAME_STORAGE_KEY && event.newValue) {
        const newName = event.newValue ? JSON.parse(event.newValue) : DEFAULT_COMPANY_NAME;
        setCompanyName(newName);
        setCompanyInitial(newName.substring(0,1).toUpperCase() || 'Q');
        if (document) {
            document.title = newName;
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
        {/* Title is now set dynamically in useEffect */}
        <meta name="description" content={String(metadataBase.description)} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen> {/* `defaultOpen` controls initial state on desktop */}
          <Sidebar variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground hidden md:flex border-r border-sidebar-border">
            <SidebarHeader className="p-3 border-b border-sidebar-border">
              <div className="px-1 py-2 group-[[data-state=expanded]]:block group-[[data-state=collapsed]]:hidden">
                <h1 className="text-xl font-semibold text-sidebar-primary-foreground truncate" title={companyName}>{companyName}</h1>
              </div>
              <div className="p-1 text-center group-[[data-state=collapsed]]:block group-[[data-state=expanded]]:hidden">
                 <span className="flex items-center justify-center h-6 w-6 mx-auto text-sidebar-foreground/80 font-bold text-lg">
                   {companyInitial}
                 </span>
              </div>
              {/* Search input removed from sidebar header */}
            </SidebarHeader>
            <SidebarContent className="flex-1 mt-2">
              <AppNav />
            </SidebarContent>
          </Sidebar>

          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-header px-4 text-header-foreground shadow-sm sm:px-6">
              <SidebarTrigger className="text-header-foreground hover:bg-accent/10 md:hidden" />
              
              <div className="flex-1 flex justify-center px-4">
                {/* Global search input removed from top header */}
              </div>

              <div className="flex items-center gap-2 ml-auto"> {/* Added ml-auto to push UserNav to the right */}
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
