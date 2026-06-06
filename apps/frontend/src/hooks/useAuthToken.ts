import { useEffect, useState } from 'react';
import { useSupabase } from '../hooks/useSupabase';

export function useAuthToken() {
  const supabase = useSupabase();
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(s => {
      if (!alive) return;
      setToken(s.data.session?.access_token);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      setToken(session?.access_token);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return token;
}
