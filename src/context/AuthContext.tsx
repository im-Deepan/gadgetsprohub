import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, isFirebaseMock } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  wishlist: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('aff_token');
    } catch {
      return null;
    }
  });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data._id,
          email: data.email,
          name: data.name,
          role: data.role,
          profileImage: data.profileImage,
          district: data.district || 'Chennai',
          wishlist: data.wishlist?.map((p: any) => p._id || p) || []
        });
        setWishlist(data.wishlist?.map((p: any) => p._id || p) || []);
      } else {
        // Token might be expired
        logout();
      }
    } catch (error) {
      console.warn("Profile fetching failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = { error: 'The authentication server returned an unexpected response. Please try registering or logging in again.' };
      }

      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failure.' };
      }
      
      localStorage.setItem('aff_token', data.token);
      setToken(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error.' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      
      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = { error: 'The server returned an unexpected response. Please try registering again.' };
      }

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }
      
      localStorage.setItem('aff_token', data.token);
      setToken(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      let email = '';
      let name = '';
      
      if (!isFirebaseMock) {
        const result = await signInWithPopup(auth, googleProvider);
        const googleUser = result.user;
        email = googleUser.email || '';
        name = googleUser.displayName || googleUser.email?.split('@')[0] || 'Google Explorer';
      } else {
        const enterEmail = window.prompt(
          "Development Simulated Google Sign-In:\nEnter your Gmail ID to login with Google:",
          "admin@example.com"
        );
        if (!enterEmail) {
          return { success: false, error: 'Google sign-in was cancelled.' };
        }
        email = enterEmail;
        name = enterEmail.split('@')[0].toUpperCase();
      }

      if (!email) {
        return { success: false, error: 'Could not resolve email from Google Account.' };
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      
      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = { error: 'The server returned an unexpected response. Please try signing in again.' };
      }
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Server registration refusal.' };
      }

      localStorage.setItem('aff_token', data.token);
      setToken(data.token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role
      });
      return { success: true };
    } catch (err: any) {
      console.warn("Google credentials retrieval error:", err);
      let errMsg = err.message || 'Google Auth aborted/failed.';
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user') || err.message?.includes('closed by user')) {
        errMsg = 'Google sign-in was closed before completion. Please try again.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        errMsg = 'Google sign-in popup opened multiple times, previous attempt cancelled. Please try again.';
      } else if (err.code === 'auth/user-cancelled' || err.message?.includes('user-cancelled')) {
        errMsg = 'Google sign-in was cancelled. Please try again.';
      }
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('aff_token');
    } catch {
      // safe
    }
    setToken(null);
    setUser(null);
    setWishlist([]);
  };

  const toggleWishlist = async (productId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/user/wishlist/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setWishlist(updated);
      }
    } catch (e) {
      console.warn("Failed to toggle wishlist item:", e);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    wishlist,
    toggleWishlist,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
