
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
import { getUserMetadata, getLibraryById, getLibrariesMetadata } from '@/lib/data'; // Added getLibrariesMetadata
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
  allLibraries: LibraryMetadata[]; // Added to store all libraries for superadmin
  switchLibraryContext: (newLibraryId: string) => Promise<void>; // For superadmin to switch context
  refreshUserAndLibraries: () => Promise<void>; // To refresh data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SUPERADMIN_LIBRARY_ID = "library_main";


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [currentLibraryId, setCurrentLibraryId] = useState<string | null>(null);
  const [currentLibraryName, setCurrentLibraryName] = useState<string | null>(null);
  const [allLibraries, setAllLibraries] = useState<LibraryMetadata[]>([]);
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
  
  const _isSuperAdmin = (metadata: UserMetadata | null) => metadata?.role === 'superadmin';
  const _isManager = (metadata: UserMetadata | null) => metadata?.role === 'manager';

  const refreshUserAndLibraries = useCallback(async (firebaseUser?: User | null) => {
    const currentUserToProcess = firebaseUser === undefined ? user : firebaseUser;
    console.log('[AuthContext] refreshUserAndLibraries: Called. Current user to process:', currentUserToProcess?.uid);
    if (currentUserToProcess) {
      try {
        const metadata = await getUserMetadata(currentUserToProcess.uid);
        console.log('[AuthContext] refreshUserAndLibraries: Fetched user metadata:', metadata);
        setUserMetadata(metadata);

        let newCurrentLibraryId = null;
        if (_isManager(metadata) && metadata.assignedLibraryId) {
          console.log(`[AuthContext] refreshUserAndLibraries: User is Manager. Assigned Library ID: ${metadata.assignedLibraryId}`);
          newCurrentLibraryId = metadata.assignedLibraryId;
        } else if (_isSuperAdmin(metadata)) {
          // For superadmin, try to keep current selection, or default
          const superAdminInitialLibId = currentLibraryId || metadata.assignedLibraryId || DEFAULT_SUPERADMIN_LIBRARY_ID;
          console.log(`[AuthContext] refreshUserAndLibraries: User is Superadmin. Effective Library ID for context: ${superAdminInitialLibId}`);
          newCurrentLibraryId = superAdminInitialLibId;
          
          // Fetch all libraries for superadmin
          const libs = await getLibrariesMetadata();
          console.log('[AuthContext] refreshUserAndLibraries: Fetched all libraries for superadmin:', libs.length);
          setAllLibraries(libs);

          // Ensure the newCurrentLibraryId is valid among all fetched libraries for superadmin
          if (libs.length > 0 && !libs.find(lib => lib.id === newCurrentLibraryId)) {
            console.warn(`[AuthContext] refreshUserAndLibraries: Superadmin's current/default library ID ${newCurrentLibraryId} not found in all libraries. Falling back to first available.`);
            newCurrentLibraryId = libs[0].id;
          } else if (libs.length === 0) {
             console.warn(`[AuthContext] refreshUserAndLibraries: No libraries found for superadmin. Setting context to null.`);
             newCurrentLibraryId = null; // No libraries to select
          }

        } else {
          console.warn('[AuthContext] refreshUserAndLibraries: User not manager/superadmin or missing library assignment. Metadata:', metadata);
        }
        
        setCurrentLibraryId(newCurrentLibraryId);
        await fetchAndSetLibraryName(newCurrentLibraryId);

      } catch (error) {
        console.error("[AuthContext] refreshUserAndLibraries: Error fetching user metadata or library context:", error);
        setUserMetadata(null);
        setCurrentLibraryId(null);
        setCurrentLibraryName(null);
        setAllLibraries([]);
      }
    } else {
      console.log('[AuthContext] refreshUserAndLibraries: No user authenticated.');
      setUserMetadata(null);
      setCurrentLibraryId(null);
      setCurrentLibraryName(null);
      setAllLibraries([]);
    }
  }, [user, fetchAndSetLibraryName, currentLibraryId]); // Added currentLibraryId to dependencies for superadmin logic


  useEffect(() => {
    console.log('[AuthContext] useEffect: Running onAuthStateChanged setup.');
    const unsubscribe = onAuthStateChanged(auth, async (currentUserAuth) => {
      console.log('[AuthContext] onAuthStateChanged: Fired. currentUserAuth:', currentUserAuth ? currentUserAuth.uid : 'null');
      setLoading(true); 
      setUser(currentUserAuth);
      await refreshUserAndLibraries(currentUserAuth); // Pass the fresh currentUserAuth
      console.log('[AuthContext] Setting loading to false after refresh.');
      setLoading(false);
    });
    return () => {
      console.log('[AuthContext] useEffect: Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, [refreshUserAndLibraries]); // refreshUserAndLibraries is memoized

  const isAuthenticated = !!user;
  const isSuperAdmin = _isSuperAdmin(userMetadata);
  const isManager = _isManager(userMetadata);


  useEffect(() => {
    if (!loading) {
      console.log(`[AuthContext] Auth state determined. isAuthenticated: ${isAuthenticated}, pathname: ${pathname}, loading: ${loading}, currentLibraryId: ${currentLibraryId}`);
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
  }, [isAuthenticated, loading, pathname, router, currentLibraryId]);

  const login = async (email: string, password_input: string): Promise<boolean> => {
    console.log(`[AuthContext] login: Attempting login for email: ${email}`);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password_input);
      console.log(`[AuthContext] login: Firebase signInWithEmailAndPassword successful for ${email}. onAuthStateChanged will handle next steps.`);
      // onAuthStateChanged's call to refreshUserAndLibraries will handle setting user, metadata and navigating
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
      // setUser(null); // onAuthStateChanged will handle this
      // setUserMetadata(null);
      // setCurrentLibraryId(null);
      // setCurrentLibraryName(null);
      // setAllLibraries([]);
      router.push('/login'); // onAuthStateChanged will then clear state and set loading=false
    } catch (error) {
      console.error("[AuthContext] logout: Error signing out:", error);
      setLoading(false); // Set loading false in case of sign out error
    }
  };
  
  const switchLibraryContext = async (newLibraryId: string) => {
    if (isSuperAdmin) {
      console.log(`[AuthContext] switchLibraryContext: Superadmin switching to library ID: ${newLibraryId}`);
      const libraryExists = allLibraries.some(lib => lib.id === newLibraryId);
      if (libraryExists) {
        setCurrentLibraryId(newLibraryId);
        await fetchAndSetLibraryName(newLibraryId);
      } else {
        console.warn(`[AuthContext] switchLibraryContext: Attempted to switch to non-existent library ID: ${newLibraryId}. No change made.`);
      }
    } else {
      console.warn("[AuthContext] switchLibraryContext: Only superadmins can switch library context.");
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
        isManager,
        allLibraries,
        switchLibraryContext,
        refreshUserAndLibraries // Expose the refresh function
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

