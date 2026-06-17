import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Set up auth state listener FIRST
      const result = supabase.auth.onAuthStateChange(
        (event, session) => {
          try {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          } catch (e) {
            console.error('Auth state change error:', e);
            setLoading(false);
          }
        }
      );
      subscription = result.data.subscription;

      // THEN check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((e) => {
        console.error('getSession error:', e);
        setLoading(false);
      });
    } catch (e) {
      console.error('Auth initialization error:', e);
      // Clear potentially corrupted auth data
      try { localStorage.removeItem('sb-emgseetomuxxgjzelsjf-auth-token'); } catch (_) {}
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && e.message?.includes('fetch');
      const error = new Error(
        isNetworkError
          ? 'NETWORK_ERROR: Impossibile raggiungere il server. Controlla le impostazioni di privacy del browser o disabilita le estensioni ad-blocker.'
          : e.message || 'Errore sconosciuto durante il login'
      );
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      return { error };
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && e.message?.includes('fetch');
      const error = new Error(
        isNetworkError
          ? 'NETWORK_ERROR: Impossibile raggiungere il server. Controlla le impostazioni di privacy del browser o disabilita le estensioni ad-blocker.'
          : e.message || 'Errore sconosciuto durante la registrazione'
      );
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Errore durante il logout:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
