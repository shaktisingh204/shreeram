
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; 
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { getUserMetadata, getLibraryById } from '@/lib/data';
import type { UserMetadata } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userMetadata: UserMetadata | null;
  login: (email: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  currentLibraryId: string | null; 
  currentLibraryName: string | null;
  isSuperAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SUPERADMIN_LIBRARY_ID = "library_main";


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [currentLibraryId, setCurrentLibraryId] = useState<string | null>(null);
  const [currentLibraryName, setCurrentLibraryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchAndSetLibraryName = useCallback(async (libraryId: string | null) => {
    if (libraryId) {
      console.log(`[AuthContext] fetchAndSetLibraryName: Fetching name for library ID: ${libraryId}`);
      const library = await getLibraryById(libraryId);
      const nameToSet = library?.name || 'Unknown Library';
      console.log(`[AuthContext] fetchAndSetLibraryName: Setting currentLibraryName to: "${nameToSet}" for ID: ${libraryId}`);
      setCurrentLibraryName(nameToSet);
    } else {
      console.log('[AuthContext] fetchAndSetLibraryName: libraryId is null, setting currentLibraryName to null.');
      setCurrentLibraryName(null);
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] useEffect: Running onAuthStateChanged setup.');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[AuthContext] onAuthStateChanged: Fired. currentUser:', currentUser ? currentUser.uid : 'null');
      setLoading(true); 
      setUser(currentUser);
      if (currentUser) {
        console.log(`[AuthContext] User authenticated: ${currentUser.uid}, Email: ${currentUser.email}`);
        try {
          const metadata = await getUserMetadata(currentUser.uid);
          console.log('[AuthContext] Fetched user metadata:', metadata);
          setUserMetadata(metadata);

          if (metadata?.role === 'manager' && metadata.assignedLibraryId) {
            console.log(`[AuthContext] User is Manager. Assigned Library ID: ${metadata.assignedLibraryId}`);
            setCurrentLibraryId(metadata.assignedLibraryId);
            await fetchAndSetLibraryName(metadata.assignedLibraryId);
          } else if (metadata?.role === 'superadmin') {
            const superAdminLibId = metadata.assignedLibraryId || DEFAULT_SUPERADMIN_LIBRARY_ID;
            console.log(`[AuthContext] User is Superadmin. Effective Library ID for initial context: ${superAdminLibId} (metadata.assignedLibraryId: ${metadata.assignedLibraryId}, fallback: ${DEFAULT_SUPERADMIN_LIBRARY_ID})`);
            setCurrentLibraryId(superAdminLibId);
            await fetchAndSetLibraryName(superAdminLibId);
          } else {
            console.warn('[AuthContext] User authenticated but not a manager/superadmin or missing library assignment. Metadata:', metadata);
            setCurrentLibraryId(null);
            setCurrentLibraryName(null);
          }
        } catch (error) {
          console.error("[AuthContext] Error fetching user metadata or setting library context:", error);
          setUserMetadata(null);
          setCurrentLibraryId(null);
          setCurrentLibraryName(null);
        }
      } else {
        console.log('[AuthContext] No user authenticated.');
        setUserMetadata(null);
        setCurrentLibraryId(null);
        setCurrentLibraryName(null);
      }
      console.log('[AuthContext] Setting loading to false.');
      setLoading(false);
    });
    return () => {
      console.log('[AuthContext] useEffect: Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, [fetchAndSetLibraryName]);

  const isAuthenticated = !!user;
  const isSuperAdmin = userMetadata?.role === 'superadmin';
  const isManager = userMetadata?.role === 'manager';


  useEffect(() => {
    if (!loading) {
      console.log(`[AuthContext] Auth state determined. isAuthenticated: ${isAuthenticated}, pathname: ${pathname}, loading: ${loading}`);
      if (!isAuthenticated && pathname !== '/login') {
        console.log('[AuthContext] Not authenticated and not on login page, redirecting to /login.');
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        console.log('[AuthContext] Authenticated and on login page, redirecting to /dashboard.');
        router.push('/dashboard');
      }
    } else {
      console.log('[AuthContext] Auth state still loading...');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = async (email: string, password_input: string): Promise<boolean> => {
    console.log(`[AuthContext] login: Attempting login for email: ${email}`);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password_input);
      console.log(`[AuthContext] login: Firebase signInWithEmailAndPassword successful for ${email}. onAuthStateChanged will handle next steps.`);
      // onAuthStateChanged will handle setting user, metadata and navigating
      // setLoading(false) is handled by onAuthStateChanged's effect after processing
      return true;
    } catch (error) {
      console.error("[AuthContext] login: Firebase Authentication Error:", error);
      setLoading(false); // Explicitly set loading false on login error
      return false;
    }
  };

  const logout = async () => {
    console.log('[AuthContext] logout: Attempting sign out.');
    setLoading(true);
    try {
      await signOut(auth);
      console.log('[AuthContext] logout: Firebase signOut successful.');
      setUser(null); // Explicitly clear state, though onAuthStateChanged will also fire
      setUserMetadata(null);
      setCurrentLibraryId(null);
      setCurrentLibraryName(null);
      router.push('/login');
    } catch (error) {
      console.error("[AuthContext] logout: Error signing out:", error);
    } finally {
        // setLoading(false); // onAuthStateChanged will set loading to false after it processes the null user
        // Let's rely on onAuthStateChanged to set loading to false to maintain consistency
    }
  };

  return (
    <AuthContext.Provider value={{ 
        isAuthenticated, 
        user, 
        userMetadata, 
        login, 
        logout, 
        loading, 
        currentLibraryId,
        currentLibraryName,
        isSuperAdmin,
        isManager
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

