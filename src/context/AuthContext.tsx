
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/firebase'; // Import db
import { ref, get } from 'firebase/database'; // Import ref and get

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Path in Firebase Realtime Database to store the admin password
const ADMIN_PASSWORD_PATH = '/config/adminPassword';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for persisted auth state
    const storedAuth = localStorage.getItem('seatSmartAuth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    } else if (!loading && isAuthenticated && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = async (passwordInput: string): Promise<boolean> => {
    setLoading(true);
    try {
      const passwordRef = ref(db, ADMIN_PASSWORD_PATH);
      const snapshot = await get(passwordRef);
      
      let storedPassword = null;
      if (snapshot.exists()) {
        storedPassword = snapshot.val();
      } else {
        console.warn(`Admin password not found at ${ADMIN_PASSWORD_PATH} in Firebase. Login will fail. Please set it in your Realtime Database.`);
        // Fallback to a default behavior or prevent login if password not set
        // For this example, if not set, login will fail.
      }

      if (typeof storedPassword === 'string' && passwordInput === storedPassword) {
        setIsAuthenticated(true);
        localStorage.setItem('seatSmartAuth', 'true');
        router.push('/dashboard');
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error("Error fetching admin password from Firebase:", error);
    }
    
    setIsAuthenticated(false);
    localStorage.removeItem('seatSmartAuth');
    setLoading(false);
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('seatSmartAuth');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
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
