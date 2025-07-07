
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState, createContext, useContext, useEffect } from "react";
import { onAuthStateChanged, type User, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth as firebaseAuth, db, isFirebaseConfigured } from "@/lib/firebase";
import { getUserRole, type User as AppUser } from "@/lib/firestore-actions";
import { setDoc, doc } from 'firebase/firestore';
import { Loader2, AlertTriangle } from "lucide-react";

function FirebaseConfigError() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-2xl rounded-lg border border-destructive bg-card p-6 text-center shadow-lg sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive">
          <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-destructive">Firebase Not Configured</h1>
        <p className="mt-2 text-muted-foreground">
          Your Firebase environment variables are missing. The application cannot start without them.
        </p>
        <div className="mt-6 text-left">
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
        </div>
      </div>
    </div>
  );
}


interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) { // Check if auth is configured
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
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

  if (!isFirebaseConfigured) {
    return <FirebaseConfigError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
