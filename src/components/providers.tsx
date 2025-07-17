
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState, createContext, useContext, useEffect, useCallback } from "react";
import { onAuthStateChanged, type User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth as firebaseAuth, db, isFirebaseConfigured, firebaseError } from "@/lib/firebase";
import { getUserRole, type User as AppUser } from "@/lib/firestore-actions";
import { setDoc, doc } from 'firebase/firestore';
import { Loader2, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { usePathname } from 'next/navigation';
import Link from "next/link";
import { cn } from "@/lib/utils";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { AppNav } from '@/components/app-nav';
import { UserNav } from '@/components/user-nav';

import {
  loadFromLocalStorage,
  saveToLocalStorage,
  COMPANY_NAME_STORAGE_KEY,
  DEFAULT_COMPANY_NAME,
  CUSTOM_THEME_STORAGE_KEY,
  type CustomThemeValues,
  DEFAULT_CUSTOM_THEME_VALUES,
  CUSTOM_FONTS_STORAGE_KEY,
  type CustomFont,
} from '@/lib/localStorage';
import { FONT_STORAGE_KEY, DEFAULT_FONT_KEY, AVAILABLE_FONTS } from '@/components/font-settings';

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

function FirebaseErrorScreen({ title, message, children }: { title: string, message: string, children?: ReactNode }) {
    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-foreground">
          <div className="w-full max-w-2xl rounded-lg border border-destructive bg-card p-6 text-center shadow-lg sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive">
              <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-destructive">{title}</h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
            {children && <div className="mt-6 text-left">{children}</div>}
          </div>
        </div>
    );
}

function FirebaseConfigError() {
  return (
    <FirebaseErrorScreen
        title="Firebase Not Configured"
        message="Your Firebase environment variables are missing. The application cannot start without them."
    >
      <p className="font-semibold">Please follow these steps:</p>
      <ol className="mt-2 list-inside list-decimal space-y-2 text-muted-foreground">
        <li>Find your Firebase project configuration in your project's settings page in the Firebase Console.</li>
        <li>
          Open the <code className="rounded bg-muted px-1.5 py-1 font-mono text-sm">.env</code> file in the root of your project.
        </li>
        <li>
          Fill in the values for the required variables.
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-4 text-xs text-card-foreground">
            {`NEXT_PUBLIC_FIREBASE_API_KEY=...\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=...\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...\nNEXT_PUBLIC_FIREBASE_APP_ID=...`}
          </pre>
        </li>
        <li>Save the <code className="rounded bg-muted px-1.5 py-1 font-mono text-sm">.env</code> file and restart the development server.</li>
      </ol>
    </FirebaseErrorScreen>
  );
}

function FirebaseInitError({ error }: { error: Error }) {
    let message = "An unknown error occurred during Firebase initialization.";
    if (error.message?.includes('auth/invalid-api-key')) {
        message = "The Firebase API Key provided in your .env file is invalid. Please verify it is correct and restart the development server.";
    }
    return (
        <FirebaseErrorScreen
            title="Firebase Initialization Failed"
            message={message}
        />
    );
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  sendPasswordReset: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRoleData = await getUserRole(firebaseUser.uid);
        if (userRoleData) {
            setAppUser(userRoleData);
        } else {
            const newAppUser: AppUser = { uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User', role: 'user', isActive: true };
            if (db) await setDoc(doc(db, "users", firebaseUser.uid), newAppUser);
            setAppUser(newAppUser);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, pass: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth is not configured.");
    return signInWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const logout = () => {
    if (!firebaseAuth) throw new Error("Firebase Auth is not configured.");
    return signOut(firebaseAuth);
  };

  const sendPasswordReset = (email: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth is not configured.");
    return sendPasswordResetEmail(firebaseAuth, email);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  const [companyName, setCompanyName] = useState<string>(DEFAULT_COMPANY_NAME);
  const [companyInitial, setCompanyInitial] = useState<string>(DEFAULT_COMPANY_NAME.substring(0,1).toUpperCase());

  useEffect(() => {
    const storedCompanyName = loadFromLocalStorage<string>(COMPANY_NAME_STORAGE_KEY, DEFAULT_COMPANY_NAME);
    setCompanyName(storedCompanyName);
    setCompanyInitial(storedCompanyName.substring(0,1).toUpperCase() || DEFAULT_COMPANY_NAME.substring(0,1).toUpperCase());

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === COMPANY_NAME_STORAGE_KEY) {
        const newName = event.newValue ? JSON.parse(event.newValue) : DEFAULT_COMPANY_NAME;
        setCompanyName(newName);
        setCompanyInitial(newName.substring(0,1).toUpperCase() || DEFAULT_COMPANY_NAME.substring(0,1).toUpperCase());
        document.title = newName || DEFAULT_COMPANY_NAME;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isSettingsActive = pathname === '/settings';
  const settingsButtonClass = cn(
      "justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5 pl-3 pr-2 group-[[data-state=collapsed]]:pl-0 group-[[data-state=collapsed]]:justify-center",
      isSettingsActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
      !isSettingsActive && "font-normal"
  );

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
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
          <SidebarFooter>
            <SidebarMenu className="group-[[data-state=collapsed]]:px-0 gap-0.5">
              <SidebarMenuItem className="relative">
                <Link href="/settings">
                  <SidebarMenuButton
                      isActive={isSettingsActive}
                      tooltip={{ children: 'Application Settings', className: "group-[[data-state=expanded]]:hidden" }}
                      aria-label="Application Settings"
                      className={settingsButtonClass}
                  >
                      {isSettingsActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-sm group-[[data-state=collapsed]]:hidden"></span>
                      )}
                      <SettingsIcon className={cn("h-5 w-5 shrink-0", isSettingsActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70")} />
                      <span className={cn("group-[[data-state=collapsed]]:hidden ml-2")}>Settings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
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
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  const applyCustomThemeVariables = useCallback((customTheme: CustomThemeValues) => {
    const root = document.documentElement;
    if (customTheme.background) root.style.setProperty('--background', customTheme.background); else root.style.removeProperty('--background');
    if (customTheme.foreground) root.style.setProperty('--foreground', customTheme.foreground); else root.style.removeProperty('--primary');
    if (customTheme.primary) root.style.setProperty('--primary', customTheme.primary); else root.style.removeProperty('--primary');
  }, []);

  const resetCustomThemeVariables = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty('--background');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--primary');
  }, []);

  const applyTheme = useCallback((themeKey: string) => {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', themeKey);
    localStorage.setItem(THEME_STORAGE_KEY, themeKey);

    if (themeKey === 'custom') {
      const storedCustomTheme = loadFromLocalStorage<CustomThemeValues>(CUSTOM_THEME_STORAGE_KEY, DEFAULT_CUSTOM_THEME_VALUES);
      applyCustomThemeVariables(storedCustomTheme);
    } else {
      resetCustomThemeVariables();
    }
  }, [applyCustomThemeVariables, resetCustomThemeVariables]);

  const applyFont = useCallback((fontKey: string) => {
    const htmlElement = document.documentElement;
    const fontName = AVAILABLE_FONTS[fontKey as keyof typeof AVAILABLE_FONTS] || fontKey;
    htmlElement.style.setProperty('--font-sans', `'${fontName}', sans-serif`);
    localStorage.setItem(FONT_STORAGE_KEY, fontKey);
  }, []);
  
  const loadCustomFonts = useCallback(() => {
    const customFonts = loadFromLocalStorage<CustomFont[]>(CUSTOM_FONTS_STORAGE_KEY, []);
    const head = document.head;

    // Clear previously added custom font links to prevent duplicates
    head.querySelectorAll('link[data-custom-font]').forEach(link => link.remove());

    customFonts.forEach(font => {
      const link = document.createElement('link');
      link.href = font.url;
      link.rel = 'stylesheet';
      link.setAttribute('data-custom-font', 'true');
      head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    const storedThemeKey = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedThemeKey && AVAILABLE_THEMES[storedThemeKey as keyof typeof AVAILABLE_THEMES]) {
      applyTheme(storedThemeKey);
    } else {
      applyTheme(DEFAULT_THEME_KEY);
    }

    loadCustomFonts();
    const storedFontKey = localStorage.getItem(FONT_STORAGE_KEY) || DEFAULT_FONT_KEY;
    applyFont(storedFontKey);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue && AVAILABLE_THEMES[event.newValue as keyof typeof AVAILABLE_THEMES]) {
        applyTheme(event.newValue);
      }
      if (event.key === FONT_STORAGE_KEY && event.newValue) {
        applyFont(event.newValue);
      }
      if (event.key === CUSTOM_THEME_STORAGE_KEY && localStorage.getItem(THEME_STORAGE_KEY) === 'custom') {
        applyCustomThemeVariables(event.newValue ? JSON.parse(event.newValue) : DEFAULT_CUSTOM_THEME_VALUES);
      }
      if (event.key === CUSTOM_FONTS_STORAGE_KEY) {
        loadCustomFonts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [applyTheme, applyFont, applyCustomThemeVariables, loadCustomFonts]);

  if (firebaseError) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body>
          <FirebaseInitError error={firebaseError} />
        </body>
      </html>
    );
  }
  
  if (!isFirebaseConfigured) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body>
          <FirebaseConfigError />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
            <ReactQueryDevtools initialIsOpen={false} />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
