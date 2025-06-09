
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
import { getUserMetadata, getLibraryById } from '@/lib/data'; // Assuming getLibraryById will be created
import type { UserMetadata } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userMetadata: UserMetadata | null;
  login: (email: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  currentLibraryId: string | null; // ID of the library the user is currently operating on
  currentLibraryName: string | null;
  isSuperAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define a default library ID for superadmins or as a fallback.
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
      const library = await getLibraryById(libraryId); // You'll need to create this function
      setCurrentLibraryName(library?.name || 'Unknown Library');
    } else {
      setCurrentLibraryName(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        try {
          const metadata = await getUserMetadata(currentUser.uid);
          setUserMetadata(metadata);
          if (metadata?.role === 'manager' && metadata.assignedLibraryId) {
            setCurrentLibraryId(metadata.assignedLibraryId);
            await fetchAndSetLibraryName(metadata.assignedLibraryId);
          } else if (metadata?.role === 'superadmin') {
            // For superadmin, default to a specific library or implement selection later
            // For now, using a default or the one from metadata if it was set (e.g. last used)
            const superAdminLibId = metadata.assignedLibraryId || DEFAULT_SUPERADMIN_LIBRARY_ID;
            setCurrentLibraryId(superAdminLibId);
            await fetchAndSetLibraryName(superAdminLibId);
          } else {
             setCurrentLibraryId(null); // No specific library context
             setCurrentLibraryName(null);
          }
        } catch (error) {
          console.error("Error fetching user metadata:", error);
          setUserMetadata(null);
          setCurrentLibraryId(null);
          setCurrentLibraryName(null);
        }
      } else {
        setUserMetadata(null);
        setCurrentLibraryId(null);
        setCurrentLibraryName(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAndSetLibraryName]);

  const isAuthenticated = !!user;
  const isSuperAdmin = userMetadata?.role === 'superadmin';
  const isManager = userMetadata?.role === 'manager';


  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && pathname !== '/login') {
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = async (email: string, password_input: string): Promise<boolean> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password_input);
      // onAuthStateChanged will handle setting user, metadata and navigating
      // setLoading(false) is handled by onAuthStateChanged's effect
      return true;
    } catch (error) {
      console.error("Firebase Authentication Error:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserMetadata(null);
      setCurrentLibraryId(null);
      setCurrentLibraryName(null);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
        setLoading(false);
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
