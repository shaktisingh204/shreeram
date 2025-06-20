
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { getUserMetadata, getLibrariesMetadata } from '@/lib/data';
import type { UserMetadata, LibraryMetadata } from '@/types';

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
  allLibraries: LibraryMetadata[]; // For SuperAdmin, all libs; for Manager, their assigned libs.
  switchLibraryContext: (newLibraryId: string) => Promise<void>;
  refreshUserAndLibraries: (firebaseUser?: User | null) => Promise<void>;
  isImpersonating: boolean;
  revertToSuperAdminView: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [currentLibraryId, setCurrentLibraryId] = useState<string | null>(null);
  const [currentLibraryName, setCurrentLibraryName] = useState<string | null>(null);
  const [allLibraries, setAllLibraries] = useState<LibraryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [superAdminOriginalContextId, setSuperAdminOriginalContextId] = useState<string | null>(null);
  
  const initiallyProcessedUser = useRef(false);

  const router = useRouter();
  const pathname = usePathname();

  const _isSuperAdmin = useCallback((metadata: UserMetadata | null) => metadata?.role === 'superadmin', []);
  const _isManager = useCallback((metadata: UserMetadata | null) => metadata?.role === 'manager', []);

  const fetchAndSetLibraryName = useCallback(async (libraryId: string | null, allLibsForContext: LibraryMetadata[]) => {
      if (libraryId === null) {
          setCurrentLibraryName("All Libraries");
          return;
      }
      if (libraryId) {
          const library = allLibsForContext.find(lib => lib.id === libraryId);
          const nameToSet = library?.name || 'Unknown Library';
          setCurrentLibraryName(nameToSet);
      } else {
          setCurrentLibraryName(null);
      }
  }, []);

  const refreshUserAndLibraries = useCallback(async (firebaseUserParam?: User | null) => {
    const currentUserToProcess = firebaseUserParam === undefined ? user : firebaseUserParam;

    if (currentUserToProcess) {
        try {
            const metadata = await getUserMetadata(currentUserToProcess.uid);
            setUserMetadata(metadata);
            
            let libsForContext: LibraryMetadata[] = [];
            let newContextToSet: string | null = null;
            
            if (_isSuperAdmin(metadata)) {
                libsForContext = await getLibrariesMetadata();
                setAllLibraries(libsForContext);

                // Preserve context on refresh unless it's invalid
                const currentContextIsValid = libsForContext.some(lib => lib.id === currentLibraryId);
                newContextToSet = isImpersonating && currentContextIsValid ? currentLibraryId : null;
                
            } else if (_isManager(metadata) && metadata.assignedLibraries) {
                const assignedIds = Object.keys(metadata.assignedLibraries);
                const allSystemLibs = await getLibrariesMetadata();
                libsForContext = allSystemLibs.filter(lib => assignedIds.includes(lib.id));
                setAllLibraries(libsForContext);

                if(libsForContext.length > 0) {
                    const currentContextIsValid = libsForContext.some(lib => lib.id === currentLibraryId);
                    newContextToSet = currentContextIsValid ? currentLibraryId : libsForContext[0].id;
                } else {
                    newContextToSet = null; // Manager has no valid assigned libraries
                }
            } else {
                 setAllLibraries([]);
            }

            setCurrentLibraryId(newContextToSet);
            await fetchAndSetLibraryName(newContextToSet, libsForContext.length > 0 ? libsForContext : await getLibrariesMetadata());
            
        } catch (error) {
            console.error("[AuthContext] refreshUserAndLibraries: Error:", error);
            setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]); setIsImpersonating(false);
        }
    } else {
        setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]);
        setIsImpersonating(false); setSuperAdminOriginalContextId(null);
        initiallyProcessedUser.current = false;
    }
  }, [user, currentLibraryId, isImpersonating, _isSuperAdmin, _isManager, fetchAndSetLibraryName]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUserAuth) => {
      setLoading(true);
      setUser(currentUserAuth);

      if (currentUserAuth) {
        await refreshUserAndLibraries(currentUserAuth);
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } else {
        // Clear all state on logout
        setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]);
        setIsImpersonating(false); setSuperAdminOriginalContextId(null);
        initiallyProcessedUser.current = false;
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // Only run once on mount

  const login = async (email: string, password_input: string): Promise<boolean> => {
    setLoading(true);
    initiallyProcessedUser.current = false;
    try {
      await signInWithEmailAndPassword(auth, email, password_input);
      // onAuthStateChanged will handle the rest
      return true;
    } catch (error) {
      console.error("[AuthContext] login: Firebase Authentication Error:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
       // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("[AuthContext] logout: Error signing out:", error);
      setLoading(false);
    }
  };

  const switchLibraryContext = useCallback(async (newLibraryId: string) => {
    const metadata = userMetadata;
    const isSA = _isSuperAdmin(metadata);
    const isMgr = _isManager(metadata);
    
    let canSwitch = false;
    if (isSA) {
        canSwitch = true; 
        if (!isImpersonating) { // Starting a new impersonation
            setSuperAdminOriginalContextId(currentLibraryId);
        }
        setIsImpersonating(true);
    } else if (isMgr && metadata?.assignedLibraries && metadata.assignedLibraries[newLibraryId]) {
        canSwitch = true;
    }

    if (canSwitch) {
        setCurrentLibraryId(newLibraryId);
        const allSystemLibs = await getLibrariesMetadata();
        await fetchAndSetLibraryName(newLibraryId, allSystemLibs);
    } else {
        console.warn(`[AuthContext] User does not have permission to switch to library ID: ${newLibraryId}`);
    }
  }, [userMetadata, _isSuperAdmin, _isManager, fetchAndSetLibraryName, isImpersonating, currentLibraryId]);

  const revertToSuperAdminView = useCallback(async () => {
    if (_isSuperAdmin(userMetadata) && isImpersonating) {
      setCurrentLibraryId(null);
      await fetchAndSetLibraryName(null, await getLibrariesMetadata());
      setIsImpersonating(false);
    }
  }, [userMetadata, _isSuperAdmin, isImpersonating, fetchAndSetLibraryName]);

  const isAuthenticated = !!user;

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
        isSuperAdmin: _isSuperAdmin(userMetadata),
        isManager: _isManager(userMetadata),
        allLibraries,
        switchLibraryContext,
        refreshUserAndLibraries,
        isImpersonating,
        revertToSuperAdminView
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
