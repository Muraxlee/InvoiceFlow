
"use client";

import type { Metadata } from 'next'; // Keep for potential static metadata
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
import { loadFromLocalStorage, COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME, CUSTOM_THEME_STORAGE_KEY, type CustomThemeValues, DEFAULT_CUSTOM_THEME_VALUES } from '@/lib/localStorage';
import { FONT_STORAGE_KEY, DEFAULT_FONT_KEY } from '@/components/font-settings';
// import { AuthProvider } from '@/contexts/auth-context'; // Will be uncommented when AuthProvider is ready

export const metadataBase: Metadata = {
  title: 'Dynamic Company App', 
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
  'vscode-dark': 'VS Code Dark',
  'custom': 'Custom User Theme',
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
  const [isMounted, setIsMounted] = useState(false); // To prevent hydration issues with localStorage

  const applyCustomThemeVariables = useCallback((customTheme: CustomThemeValues) => {
    const root = document.documentElement;
    if (customTheme.background) root.style.setProperty('--background', customTheme.background);
    if (customTheme.foreground) root.style.setProperty('--foreground', customTheme.foreground);
    if (customTheme.primary) root.style.setProperty('--primary', customTheme.primary);
    // Add more variables here if custom theme expands
  }, []);

  const resetCustomThemeVariables = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty('--background');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--primary');
    // Add more variables here if custom theme expands
  }, []);

  const applyTheme = useCallback((themeKey: string) => {
    const htmlElement = document.documentElement;
    Object.keys(AVAILABLE_THEMES).forEach(key => {
      htmlElement.removeAttribute(`data-theme-${key}`); // Should be removeAttribute('data-theme') then set new one
    });
    htmlElement.setAttribute('data-theme', themeKey); // This applies the theme based on globals.css
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    setCurrentThemeKey(themeKey);

    if (themeKey === 'custom') {
      const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
      applyCustomThemeVariables(storedCustomTheme);
    } else {
      resetCustomThemeVariables(); 
    }
  }, [applyCustomThemeVariables, resetCustomThemeVariables]);

  useEffect(() => {
    setIsMounted(true); // Component has mounted, safe to use localStorage

    const storedThemeKey = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedThemeKey && AVAILABLE_THEMES[storedThemeKey as keyof typeof AVAILABLE_THEMES]) {
      applyTheme(storedThemeKey);
    } else {
      applyTheme(DEFAULT_THEME_KEY);
    }

    const storedFontKey = localStorage.getItem(FONT_STORAGE_KEY);
    const htmlElement = document.documentElement;
    const fontKeys = ['inter', 'roboto', 'open-sans', 'montserrat', 'poppins', 'lato', 'nunito', 'system'];
    fontKeys.forEach(key => htmlElement.classList.remove(`font-${key}`));
    
    const activeFontKey = storedFontKey || DEFAULT_FONT_KEY;
    htmlElement.classList.add(`font-${activeFontKey}`);
    document.body.style.fontFamily = activeFontKey === "system"
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
      : `'${activeFontKey.charAt(0).toUpperCase() + activeFontKey.slice(1)}', sans-serif`;

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
      if (event.key === COMPANY_NAME_STORAGE_KEY) {
        const newName = event.newValue ? JSON.parse(event.newValue) : DEFAULT_COMPANY_NAME;
        setCompanyName(newName);
        setCompanyInitial(newName.substring(0,1).toUpperCase() || 'Q');
        if (document) {
            document.title = newName;
        }
      }
      if (event.key === CUSTOM_THEME_STORAGE_KEY && currentThemeKey === 'custom') {
        const newCustomTheme = event.newValue ? JSON.parse(event.newValue) : DEFAULT_CUSTOM_THEME_VALUES;
        applyCustomThemeVariables(newCustomTheme);
      }
      if (event.key === FONT_STORAGE_KEY && event.newValue) {
        const newFontKey = event.newValue || DEFAULT_FONT_KEY;
        fontKeys.forEach(key => htmlElement.classList.remove(`font-${key}`));
        htmlElement.classList.add(`font-${newFontKey}`);
        document.body.style.fontFamily = newFontKey === "system"
          ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
          : `'${newFontKey.charAt(0).toUpperCase() + newFontKey.slice(1)}', sans-serif`;
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [applyTheme, currentThemeKey, applyCustomThemeVariables]);

  // Prevent rendering anything until isMounted is true to avoid hydration mismatches
  // related to localStorage access.
  if (!isMounted) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>{DEFAULT_COMPANY_NAME}</title>
          <meta name="description" content={String(metadataBase.description)} />
        </head>
        <body className="antialiased">
          {/* Minimal loader or skeleton can go here if desired */}
        </body>
      </html>
    );
  }

  return (
    // <AuthProvider> // Will be uncommented when AuthProvider is ready
    <html lang="en" suppressHydrationWarning data-theme={currentThemeKey}>
      <head>
        {/* Title is now set dynamically in useEffect */}
        <meta name="description" content={String(metadataBase.description)} />
      </head>
      <body
        className="antialiased" 
        // style={{ fontFamily: `var(--font-${currentFontKey})` }} // Managed by class on html
      >
        <SidebarProvider defaultOpen> 
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
            </SidebarHeader>
            <SidebarContent className="flex-1 mt-2">
              <AppNav />
            </SidebarContent>
          </Sidebar>

          <div className="flex flex-col flex-1">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-header px-4 text-header-foreground shadow-sm sm:px-6">
              <SidebarTrigger className="text-header-foreground hover:bg-accent/10 md:hidden" />
              
              <div className="flex-1 flex justify-center px-4">
                {/* Search input removed */}
              </div>

              <div className="flex items-center gap-2 ml-auto">
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
    // </AuthProvider>
  );
}
