import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshMe = () =>
    api('/api/me').then(setMe, (e) => { setMe(null); setError(e.message); });

  useEffect(() => {
    setError(null);
    if (!session) { setMe(null); setLoading(false); return; }
    setLoading(true);
    refreshMe().finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <Ctx.Provider value={{ session, me, loading, error, refreshMe, signOut: () => supabase.auth.signOut() }}>
      {children}
    </Ctx.Provider>
  );
}
