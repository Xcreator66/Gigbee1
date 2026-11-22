import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthValue = { session: Session | null; loading: boolean };
const Context = createContext<AuthValue>({ session: null, loading: true });
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (alive) { setSession(next); setLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
