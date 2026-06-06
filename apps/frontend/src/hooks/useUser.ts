import { useEffect, useState } from "react";
import { useSupabase } from "./useSupabase";

export function UseUser() {
    const supabase = useSupabase();
    const [claims, setClaims] = useState(null);
    useEffect(() => {
    supabase.auth.getClaims().then(({ data: { claims } }) => {
      setClaims(claims)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getClaims().then(({ data: { claims } }) => {
        setClaims(claims)
      })
    })
    return () => subscription?.unsubscribe && subscription.unsubscribe()
  }, [supabase]);
  return claims;
}
