import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider, isFirebaseMock } from '../firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/localStorage';
import { mapErrorToFriendly } from '../utils/errorMapper';
import { useToast } from './ToastContext';
import { apiFetch } from '../utils/apiClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; verificationUrlSimulated?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; message?: string; verificationUrlSimulated?: string; smtpError?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; email?: string }>;
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
    return safeGetItem('aff_token');
  });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const refreshProfile = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch('/api/user/profile', {
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
          wishlist: data.wishlist?.map((p: { _id?: string } | string) => typeof p === 'string' ? p : (p._id || p)) || [],
          isVerified: data.isVerified ?? true,
          pendingEmail: data.pendingEmail
        });
        setWishlist(data.wishlist?.map((p: { _id?: string } | string) => typeof p === 'string' ? p : (p._id || p)) || []);
      } else if (res.status === 401 || res.status === 403) {
        // Safe logout processing without ending loading prematurely
        safeRemoveItem('aff_token');
        setToken(null);
        setUser(null);
        setWishlist([]);
      } else {
        // For other errors, don't clear session automatically
        console.warn(`Profile refresh failed with status: ${res.status}`);
      }
    } catch (error) {
      console.warn("Profile fetching failed:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifiedToken = params.get('verifiedToken');
    const emailUpdated = params.get('emailUpdated');
    if (verifiedToken) {
      safeSetItem('aff_token', verifiedToken);
      setToken(verifiedToken);
      if (emailUpdated === 'true') {
        showToast('Your new email address has been successfully verified and updated on your account record!', 'success', 6000, 'User Action');
      } else {
        showToast('Your email has been successfully verified! You have been logged in automatically.', 'success', 5000, 'User Action');
      }
      
      // Clean up URL query parameters
      params.delete('verifiedToken');
      params.delete('emailUpdated');
      const newQuery = params.toString();
      const newPath = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, document.title, newPath);
    }
  }, [showToast]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const fallbackBackendLogin = async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        let data: Record<string, unknown> = {};
        try {
          const text = await res.text();
          data = JSON.parse(text);
        } catch (jsonErr) {
          data = { error: 'The server returned an unexpected response. Please try again.' };
        }

        if (!res.ok) {
          return { 
            success: false, 
            error: (data.error as string) || 'Authentication failure.',
            verificationUrlSimulated: data.verificationUrlSimulated as string | undefined
          };
        }
        
        safeSetItem('aff_token', data.token as string);
        setToken(data.token as string);
        const userData = data.user as Record<string, unknown>;
        setUser({
          id: userData.id as string,
          email: userData.email as string,
          name: userData.name as string,
          role: userData.role as 'user' | 'admin',
          isVerified: true
        });
        return { success: true };
      } finally {
        setLoading(false);
      }
  };

  const login = async (email: string, password: string) => {
    return await fallbackBackendLogin(email, password);
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      if (!isFirebaseMock) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          
          // Register in backend as well, which will send our custom verification link
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
          });
          
          let data: Record<string, unknown> = {};
          try {
            const text = await res.text();
            data = JSON.parse(text);
          } catch (jsonErr) {
            data = { error: 'The server returned an unexpected response. Please try again.' };
          }

          if (!res.ok) {
            try {
              await cred.user.delete();
            } catch (delErr) {
              console.warn("Failed to delete Firebase user after backend registry error:", delErr);
            }
            return { success: false, error: (data.error as string) || 'Backend registration failed.' };
          }
          
          await auth.signOut();
          return {
            success: true,
            message: (data.message as string) || 'Registration successful! A verification link has been sent to your email. Please verify before signing in.',
            verificationUrlSimulated: data.verificationUrlSimulated as string | undefined,
            smtpError: data.smtpError as string | undefined
          };
        } catch (fbErr: unknown) {
          const e = fbErr as { code?: string, message?: string };
          if (e.code === 'auth/email-already-in-use') {
            return { success: false, error: 'Email already in use. Please sign in.' };
          } else if (e.code === 'auth/operation-not-allowed') {
            console.warn('Firebase auth operation-not-allowed, falling back to backend register.');
          } else {
            return { success: false, error: e.message || String(fbErr) };
          }
        }
      }
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      
      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = { error: 'The server returned an unexpected response. Please try again.' };
      }

      if (!res.ok) {
        return { success: false, error: (data.error as string) || 'Registration failed.' };
      }
      
      return {
        success: true,
        message: (data.message as string) || 'Registration successful! A verification link has been sent to your email. Please verify before signing in.',
        verificationUrlSimulated: data.verificationUrlSimulated as string | undefined,
        smtpError: data.smtpError as string | undefined
      };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      const friendly = mapErrorToFriendly(e, 'create your user account');
      return { success: false, error: friendly.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      let email = '';
      let name = '';
      let googleId = '';
      
      if (!isFirebaseMock) {
        const result = await signInWithPopup(auth, googleProvider);
        const googleUser = result.user;
        email = googleUser.email || '';
        name = googleUser.displayName || googleUser.email?.split('@')[0] || 'Google Explorer';
        googleId = googleUser.uid;
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
        googleId = 'simulated_' + email.split('@')[0];
      }

      if (!email) {
        return { success: false, error: 'Could not resolve email from Google Account.' };
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, googleId })
      });
      
      let data: Record<string, unknown> = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        data = { error: 'The server returned an unexpected response. Please try signing in again.' };
      }
      
      if (!res.ok) {
        return { success: false, error: (data.error as string) || 'Server registration refusal.' };
      }

      safeSetItem('aff_token', data.token as string);
      setToken(data.token as string);
      const userData = data.user as Record<string, unknown>;
      setUser({
        id: userData.id as string,
        email: userData.email as string,
        name: userData.name as string,
        role: userData.role as 'user' | 'admin',
        isVerified: true
      });
      return { success: true, email: userData.email as string };
    } catch (err: unknown) {
      console.warn("Google credentials retrieval error:", err);
      const e = err as { code?: string, message?: string };
      let errMsg = e.message || 'Google Sign-In process could not be completed.';
      if (e.code === 'auth/popup-closed-by-user' || e.message?.includes('popup-closed-by-user') || e.message?.includes('closed by user')) {
        errMsg = 'The sign-in window was closed before completion. Please try again and keep the login pop-up active.';
      } else if (e.code === 'auth/cancelled-popup-request' || e.message?.includes('cancelled-popup-request')) {
        errMsg = 'Authenticating window request was overlap-cancelled. Please try again.';
      } else if (e.code === 'auth/user-cancelled' || e.message?.includes('user-cancelled')) {
        errMsg = 'Google sign-in authentication was cancelled.';
      } else {
        const friendly = mapErrorToFriendly(err, 'sign in with Google');
        errMsg = friendly.message;
      }
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    safeRemoveItem('aff_token');
    setToken(null);
    setUser(null);
    setWishlist([]);
  };

  const toggleWishlist = async (productId: string) => {
    if (!token) return;
    const previousWishlist = [...wishlist];
    
    // Optimistic UI update
    const isWished = wishlist.includes(productId);
    setWishlist(isWished ? wishlist.filter(id => id !== productId) : [...wishlist, productId]);
    
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
      } else {
        // Rollback on server error
        setWishlist(previousWishlist);
      }
    } catch (e) {
      console.warn("Failed to toggle wishlist item network error:", e);
      // Rollback on network error
      setWishlist(previousWishlist);
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
