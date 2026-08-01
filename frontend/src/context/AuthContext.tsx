'use client';

/**
 * Authentication Context
 * Manages Firebase auth state and syncs with MongoDB backend
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '@/lib/firebase';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  requiresUsername: boolean;
  completeProfile: (username: string, displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresUsername, setRequiresUsername] = useState(false);

  async function syncUser(fbUser: FirebaseUser) {
    try {
      const { user: mongoUser, isNew, requiresUsername: needsUsername } = await api.post<{
        user: User;
        isNew: boolean;
        requiresUsername?: boolean;
      }>('/api/auth/sync', {
        displayName: fbUser.displayName,
      });

      if (needsUsername) {
        setRequiresUsername(true);
      } else {
        setUser(mongoUser);
        setRequiresUsername(false);
      }
    } catch (err: unknown) {
      // If backend returns requiresUsername: true, it's a 400 not an error
      if (err instanceof Error && err.message.includes('Username required')) {
        setRequiresUsername(true);
      }
    }
  }

  async function completeProfile(username: string, displayName: string) {
    if (!firebaseUser) return;
    const { user: mongoUser } = await api.post<{ user: User; isNew: boolean }>('/api/auth/sync', {
      username,
      displayName,
    });
    setUser(mongoUser);
    setRequiresUsername(false);
  }

  async function refreshUser() {
    if (!firebaseUser) return;
    const me = await api.get<User>('/api/users/me');
    setUser(me);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncUser(fbUser);
      } else {
        setUser(null);
        setRequiresUsername(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithGithub = async () => {
    await signInWithPopup(auth, githubProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser, user, loading,
      signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail,
      logout, refreshUser, requiresUsername, completeProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
