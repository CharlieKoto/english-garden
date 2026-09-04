import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, syntheticEmail } from './supabase';

export const USERNAME_RULES = 'Use 3–20 characters: letters, numbers, underscore or hyphen.';

export function validateUsername(name: string): string | null {
  const n = name.trim();
  if (n.length < 3) return 'Username must be at least 3 characters.';
  if (n.length > 20) return 'Username must be 20 characters or fewer.';
  if (!/^[A-Za-z0-9_-]+$/.test(n)) return USERNAME_RULES;
  return null;
}

interface AuthValue {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  username: string | null;
  /** Signed in, but no row in `usernames` yet — finish setup before using the app. */
  needsUsername: boolean;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  claimUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Turns Supabase's terse auth errors into something a person can act on. */
function readableAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong username or password.';
  if (m.includes('user already registered')) return 'That username is already taken.';
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (m.includes('email address') && m.includes('invalid')) {
    return 'That username contains characters the server rejected. Stick to letters, numbers, _ and -.';
  }
  if (m.includes('confirmation') || m.includes('confirm your email')) {
    return 'Email confirmation is still switched on in Supabase. Turn it off under Authentication → Sign In / Providers, since accounts here have no real email.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const loadSeq = useRef(0);

  // Load the handle attached to the current session. Sign-up fires this from two
  // places at once (the auth-state listener and signUp itself); the sequence
  // guard makes sure a slow earlier read can't overwrite a newer result with null.
  const loadUsername = useCallback(async (uid: string) => {
    const seq = ++loadSeq.current;
    const { data } = await supabase
      .from('usernames')
      .select('username')
      .eq('user_id', uid)
      .maybeSingle();
    if (seq !== loadSeq.current) return;
    setUsername(data?.username ?? null);
    setProfileChecked(true);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        loadUsername(data.session.user.id).finally(() => active && setLoading(false));
      } else {
        setProfileChecked(true);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        setProfileChecked(false);
        loadUsername(next.user.id);
      } else {
        setUsername(null);
        setProfileChecked(true);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUsername]);

  const signUp = useCallback(async (name: string, password: string) => {
    const invalid = validateUsername(name);
    if (invalid) throw new Error(invalid);

    // Check the handle first so a collision doesn't strand an orphan auth user.
    const { data: available, error: checkErr } = await supabase.rpc('username_available', {
      p_username: name,
    });
    if (checkErr) throw new Error(readableAuthError(checkErr.message));
    if (!available) throw new Error('That username is already taken.');

    const { data, error } = await supabase.auth.signUp({
      email: syntheticEmail(name),
      password,
    });
    if (error) throw new Error(readableAuthError(error.message));

    if (!data.session) {
      throw new Error(
        'Account created but no session was returned — email confirmation is probably still enabled in Supabase. Turn it off under Authentication → Sign In / Providers.'
      );
    }

    const { error: nameErr } = await supabase
      .from('usernames')
      .insert({ user_id: data.session.user.id, username: name.trim() });
    if (nameErr && nameErr.code !== '23505') {
      throw new Error(`Account created, but saving the username failed: ${nameErr.message}`);
    }
    // Re-read rather than assuming, so this is the authoritative final value.
    await loadUsername(data.session.user.id);
  }, [loadUsername]);

  const signIn = useCallback(async (name: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail(name),
      password,
    });
    if (error) throw new Error(readableAuthError(error.message));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUsername(null);
  }, []);

  // Recovery path: an account exists but its `usernames` row never landed.
  const claimUsername = useCallback(async (name: string) => {
    const invalid = validateUsername(name);
    if (invalid) throw new Error(invalid);
    const uid = session?.user.id;
    if (!uid) throw new Error('Not signed in.');

    // Upsert first and read the unique violation, rather than pre-checking —
    // a pre-check would report "taken" for a handle this same account owns.
    const { error } = await supabase
      .from('usernames')
      .upsert({ user_id: uid, username: name.trim() });
    if (error) {
      throw new Error(
        error.code === '23505' ? 'That username is already taken.' : error.message
      );
    }
    await loadUsername(uid);
  }, [session, loadUsername]);

  const value: AuthValue = {
    loading,
    session,
    userId: session?.user.id ?? null,
    username,
    needsUsername: !!session && profileChecked && !username,
    signUp,
    signIn,
    signOut,
    claimUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
