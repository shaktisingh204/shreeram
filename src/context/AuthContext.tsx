
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/firebase'; 
import { ref, get, set } from 'firebase/database'; 

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateAdminPassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSWORD_PATH = '/config/adminPassword';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
        // If not set in DB, use a default temporary password for first setup, e.g. 'password123'
        // This is a fallback, ideally it should be set in DB.
        if (passwordInput === 'password123') {
            setIsAuthenticated(true);
            localStorage.setItem('seatSmartAuth', 'true');
            // Optionally set this password in DB if it's the first login
            // await set(passwordRef, 'password123');
            router.push('/dashboard');
            setLoading(false);
            return true;
        }
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

  const updateAdminPassword = async (newPassword: string): Promise<boolean> => {
    try {
      const passwordRef = ref(db, ADMIN_PASSWORD_PATH);
      await set(passwordRef, newPassword);
      return true;
    } catch (error) {
      console.error("Error updating admin password in Firebase:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, updateAdminPassword }}>
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

