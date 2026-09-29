import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, fetchUserProfile, DEMO_PROFILES, switchDemoUser } from '../lib/supabase';
import { UserProfile, UserRole } from '../types/database';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, name: string, role: UserRole, department: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured());

  // Theme setup
  useEffect(() => {
    const savedTheme = localStorage.getItem('CAMPUSVOICE_THEME') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('CAMPUSVOICE_THEME', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Auth Initialization
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (mounted && profile) {
              setUser(profile);
              setIsDemoMode(false);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Error reading Supabase session:', e);
        }
      }

      // Check for saved demo session or default to student
      const savedDemoUser = localStorage.getItem('CAMPUSVOICE_DEMO_USER');
      if (savedDemoUser) {
        try {
          const parsed = JSON.parse(savedDemoUser);
          if (mounted) {
            setUser(parsed);
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Default demo initial user
      if (mounted) {
        setUser(DEMO_PROFILES['demo-student-1']);
        setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth changes if configured
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted && profile) {
            setUser(profile);
            setIsDemoMode(false);
          }
        } else if (!isDemoMode && mounted) {
          setUser(null);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [isDemoMode]);

  const signIn = async (email: string, pass: string): Promise<{ error?: string }> => {
    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (error) {
          setLoading(false);
          return { error: error.message };
        }

        if (data.user) {
          const profile = await fetchUserProfile(data.user.id);
          if (profile) {
            setUser(profile);
            setIsDemoMode(false);
            setLoading(false);
            return {};
          }
        }
      } catch (err: any) {
        setLoading(false);
        return { error: err.message || 'Failed to sign in' };
      }
    }

    // Demo / fallback credentials matching
    const emailLower = email.toLowerCase().trim();
    if (emailLower.includes('hod') || emailLower.includes('ramesh')) {
      const u = DEMO_PROFILES['demo-hod-1'];
      setUser(u);
      switchDemoUser('demo-hod-1');
      setLoading(false);
      return {};
    }

    if (emailLower.includes('principal') || emailLower.includes('sunita') || emailLower.includes('admin')) {
      const u = DEMO_PROFILES['demo-principal-1'];
      setUser(u);
      switchDemoUser('demo-principal-1');
      setLoading(false);
      return {};
    }

    // Default to student
    const u = DEMO_PROFILES['demo-student-1'];
    setUser(u);
    switchDemoUser('demo-student-1');
    setLoading(false);
    return {};
  };

  const signUp = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    department: string
  ): Promise<{ error?: string }> => {
    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { name, role, department },
          },
        });

        if (error) {
          setLoading(false);
          return { error: error.message };
        }

        if (data.user) {
          // Insert profile row into profiles table
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            role,
            department,
          });

          const newProfile: UserProfile = {
            id: data.user.id,
            name,
            role,
            department,
          };
          setUser(newProfile);
          setIsDemoMode(false);
          setLoading(false);
          return {};
        }
      } catch (err: any) {
        setLoading(false);
        return { error: err.message || 'Sign up failed' };
      }
    }

    // In demo mode: create local user
    const localId = `demo-${role}-${Date.now()}`;
    const newProfile: UserProfile = {
      id: localId,
      name,
      role,
      department,
    };
    setUser(newProfile);
    localStorage.setItem('CAMPUSVOICE_DEMO_USER', JSON.stringify(newProfile));
    setLoading(false);
    return {};
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    localStorage.removeItem('CAMPUSVOICE_DEMO_USER');
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    let key = 'demo-student-1';
    if (role === 'hod') key = 'demo-hod-1';
    if (role === 'principal') key = 'demo-principal-1';

    const p = switchDemoUser(key);
    setUser(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        toggleTheme,
        signIn,
        signUp,
        signOut,
        switchRole,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
