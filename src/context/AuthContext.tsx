
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
import { getUserMetadata, getLibraryById, getLibrariesMetadata } from '@/lib/data';
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
  allLibraries: LibraryMetadata[];
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

  const _isSuperAdmin = (metadata: UserMetadata | null) => metadata?.role === 'superadmin';
  const _isManager = (metadata: UserMetadata | null) => metadata?.role === 'manager';

  const fetchAndSetLibraryName = useCallback(async (libraryId: string | null) => {
    if (libraryId === null) {
      setCurrentLibraryName("All Libraries");
      return;
    }
    if (libraryId) {
      const library = await getLibraryById(libraryId);
      const nameToSet = library?.name || 'Unknown Library';
      setCurrentLibraryName(nameToSet);
    } else {
      setCurrentLibraryName(null);
    }
  }, []);

  const refreshUserAndLibraries = useCallback(async (firebaseUserParam?: User | null) => {
    const currentUserToProcess = firebaseUserParam === undefined ? user : firebaseUserParam;
    console.log('[AuthContext] refreshUserAndLibraries: Called. User to process:', currentUserToProcess?.uid, 'Was impersonating:', isImpersonating, 'Original context:', superAdminOriginalContextId);

    if (currentUserToProcess) {
      try {
        const metadata = await getUserMetadata(currentUserToProcess.uid);
        console.log('[AuthContext] refreshUserAndLibraries: Fetched user metadata:', metadata);
        setUserMetadata(metadata);
        let newContextToSet = currentLibraryId;

        if (_isManager(metadata) && metadata.assignedLibraryId) {
          console.log(`[AuthContext] refreshUserAndLibraries: User is Manager. Assigned Library ID: ${metadata.assignedLibraryId}`);
          newContextToSet = metadata.assignedLibraryId;
          if(isImpersonating) setIsImpersonating(false);
        } else if (_isSuperAdmin(metadata)) {
          console.log(`[AuthContext] refreshUserAndLibraries: User is Superadmin.`);
          const libs = await getLibrariesMetadata();
          setAllLibraries(libs);

          if (!initiallyProcessedUser.current && firebaseUserParam) {
            console.log("[AuthContext] Superadmin: Fresh login. Setting to 'All Libraries' view.");
            newContextToSet = null;
            setIsImpersonating(false);
            setSuperAdminOriginalContextId(null);
          } else if (isImpersonating) {
            console.log(`[AuthContext] Superadmin: Refresh while impersonating. Current impersonated library: ${currentLibraryId}`);
            newContextToSet = currentLibraryId;
          } else {
            console.log(`[AuthContext] Superadmin: Refresh, not impersonating. Context should be original: ${superAdminOriginalContextId}`);
            newContextToSet = superAdminOriginalContextId;
          }

          if (libs.length === 0) {
            newContextToSet = null;
            if(isImpersonating) setIsImpersonating(false);
          } else if (newContextToSet && !libs.find(lib => lib.id === newContextToSet)) {
            console.warn(`[AuthContext] Superadmin's context library ID ${newContextToSet} not found among available libraries. Falling back to 'All Libraries'.`);
            newContextToSet = null;
            if(isImpersonating) setIsImpersonating(false);
          }
        } else {
          console.warn('[AuthContext] refreshUserAndLibraries: User not manager/superadmin or missing library assignment. Metadata:', metadata);
          newContextToSet = null;
          if(isImpersonating) setIsImpersonating(false);
        }

        setCurrentLibraryId(newContextToSet);
        await fetchAndSetLibraryName(newContextToSet);

      } catch (error) {
        console.error("[AuthContext] refreshUserAndLibraries: Error:", error);
        setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]); setIsImpersonating(false);
      }
    } else {
      console.log('[AuthContext] refreshUserAndLibraries: No user authenticated.');
      setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]); setIsImpersonating(false); setSuperAdminOriginalContextId(null);
    }

    if (firebaseUserParam && !initiallyProcessedUser.current) {
        initiallyProcessedUser.current = true;
    }
  }, [user, fetchAndSetLibraryName, currentLibraryId, isImpersonating, superAdminOriginalContextId]);


  useEffect(() => {
    console.log('[AuthContext] useEffect: Running onAuthStateChanged setup.');
    const unsubscribe = onAuthStateChanged(auth, async (currentUserAuth) => {
      console.log('[AuthContext] onAuthStateChanged: Fired. currentUserAuth:', currentUserAuth ? currentUserAuth.uid : 'null', 'Current pathname:', pathname);
      setLoading(true);
      setUser(currentUserAuth);

      if (currentUserAuth) {
        await refreshUserAndLibraries(currentUserAuth);
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } else {
        setUserMetadata(null); setCurrentLibraryId(null); setCurrentLibraryName(null); setAllLibraries([]);
        setIsImpersonating(false); setSuperAdminOriginalContextId(null);
        initiallyProcessedUser.current = false;
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });
    return () => {
      console.log('[AuthContext] useEffect: Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, [refreshUserAndLibraries, router, pathname]);


  const login = async (email: string, password_input: string): Promise<boolean> => {
    console.log(`[AuthContext] login: Attempting login for email: ${email}`);
    setLoading(true);
    initiallyProcessedUser.current = false;
    try {
      await signInWithEmailAndPassword(auth, email, password_input);
      console.log(`[AuthContext] login: Firebase signInWithEmailAndPassword successful for ${email}. onAuthStateChanged will handle next steps.`);
      return true;
    } catch (error) {
      console.error("[AuthContext] login: Firebase Authentication Error:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    console.log('[AuthContext] logout: Attempting sign out.');
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("[AuthContext] logout: Error signing out:", error);
      setLoading(false);
    }
  };

  const switchLibraryContext = useCallback(async (newManagerLibraryId: string) => {
    if (_isSuperAdmin(userMetadata)) {
      console.log(`[AuthContext] switchLibraryContext: Superadmin attempting to switch to library ID: ${newManagerLibraryId}. Currently impersonating: ${isImpersonating}. Original context was: ${superAdminOriginalContextId}. Current context: ${currentLibraryId}`);
      const libraryToImpersonate = allLibraries.find(lib => lib.id === newManagerLibraryId);
      if (libraryToImpersonate) {
        if (!isImpersonating) {
          console.log(`[AuthContext] switchLibraryContext: Starting new impersonation. Storing current context (${currentLibraryId}) as original.`);
          setSuperAdminOriginalContextId(currentLibraryId);
        }
        setCurrentLibraryId(newManagerLibraryId);
        setCurrentLibraryName(libraryToImpersonate.name);
        setIsImpersonating(true);
        console.log(`[AuthContext] switchLibraryContext: Switched. New currentLibraryId: ${newManagerLibraryId}, isImpersonating: true. Original context ID stored: ${superAdminOriginalContextId}`);
      } else {
        console.warn(`[AuthContext] switchLibraryContext: Library ID ${newManagerLibraryId} not found in allLibraries. No switch performed.`);
      }
    } else {
      console.warn("[AuthContext] switchLibraryContext: Only superadmins can switch library context.");
    }
  }, [userMetadata, allLibraries, currentLibraryId, isImpersonating, superAdminOriginalContextId]);

  const revertToSuperAdminView = useCallback(async () => {
    if (_isSuperAdmin(userMetadata) && isImpersonating) {
      console.log(`[AuthContext] revertToSuperAdminView: Reverting to original context ID: ${superAdminOriginalContextId}`);
      setCurrentLibraryId(superAdminOriginalContextId);
      await fetchAndSetLibraryName(superAdminOriginalContextId);
      setIsImpersonating(false);
      console.log(`[AuthContext] revertToSuperAdminView: Reverted. currentLibraryId: ${superAdminOriginalContextId}, isImpersonating: false.`);
    }
  }, [userMetadata, isImpersonating, superAdminOriginalContextId, fetchAndSetLibraryName]);

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
