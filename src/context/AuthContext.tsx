import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, isFirebaseMock } from '../firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

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

  const fallbackBackendLogin = async (email: string, password: string) => {
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
  };

  const login = async (email: string, password: string) => {
    try {
      if (!isFirebaseMock) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          if (!cred.user.emailVerified) {
             await sendEmailVerification(cred.user);
             await auth.signOut();
             return { success: false, error: 'Please verify your email to continue. A new verification link has been sent to your inbox.' };
          }
          
          // They verified their email with Firebase. Now inform the backend using the google endpoint,
          // which issues our backend JWT.
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cred.user.email, name: cred.user.displayName || email.split('@')[0] })
          });
          
          let data: any = {};
          try {
            data = await res.json();
          } catch(e) {
            data = { error: 'Server authentication issue.' };
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
          
        } catch (fbErr: any) {
             // If account doesn't exist in Firebase or wrong password, try backend directly
             if (fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/wrong-password') {
                 // Try legacy backend auth if user doesn't exist in Firebase or if it's generic error
                 return await fallbackBackendLogin(email, password);
             } else if (fbErr.code === 'auth/operation-not-allowed') {
                 // Email/password provider disabled in Firebase, use backend
                 return await fallbackBackendLogin(email, password);
             } else {
                 return { success: false, error: fbErr.message };
             }
        }
      } else {
        return await fallbackBackendLogin(email, password);
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error.' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      if (!isFirebaseMock) {
        try {
           const cred = await createUserWithEmailAndPassword(auth, email, password);
           await sendEmailVerification(cred.user);
           
           // Register in backend as well, but do not set the token yet
           await fetch('/api/auth/register', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, password, name })
           });
           
           await auth.signOut();
           return { success: false, error: 'Registration successful! A verification link has been sent to your email. Please verify before signing in.' };
        } catch (fbErr: any) {
           if (fbErr.code === 'auth/email-already-in-use') {
             return { success: false, error: 'Email already in use. Please sign in.' };
           } else if (fbErr.code === 'auth/operation-not-allowed') {
             // Fallback if not enabled
           } else {
             return { success: false, error: fbErr.message };
           }
        }
      }
      
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
        errMsg = 'Google sign-in was closed before completion. Please try again. (If you are on Render, make sure to add your site URL to Firebase Authorized Domains)';
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
