
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState, createContext, useContext, useEffect } from "react";
import { onAuthStateChanged, type User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getUserRole, type User as AppUser } from "@/lib/firestore-actions";
import { setDoc, doc } from 'firebase/firestore';
import { Loader2 } from "lucide-react";

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch custom user data from Firestore
        const userRoleData = await getUserRole(firebaseUser.uid);
        if (userRoleData) {
            setAppUser(userRoleData);
        } else {
            // This case handles users created via Auth emulator but without a firestore doc
            const newAppUser: AppUser = { uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User', role: 'user', isActive: true };
            await setDoc(doc(db, "users", firebaseUser.uid), newAppUser);
            setAppUser(newAppUser);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      // Self-healing for default admin user in development when data isn't imported
      if (process.env.NODE_ENV === 'development' && error.code === 'auth/user-not-found' && email === 'admin@example.com') {
        console.log("Default admin user not found. Attempting to create and sign in...");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Create the corresponding admin user document in Firestore
            const newAdminUser: AppUser = {
                uid: userCredential.user.uid,
                email: email,
                name: 'Admin User',
                role: 'admin',
                isActive: true
            };
            await setDoc(doc(db, "users", userCredential.user.uid), newAdminUser);
            console.log("Default admin user created successfully.");
            // The onAuthStateChanged listener will handle setting user state
            return userCredential;
        } catch (creationError: any) {
            console.error("Failed to create default admin user:", creationError);
            // Throw original error if creation fails, it's a more relevant message
            throw error;
        }
      }
      // Re-throw any other errors
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
