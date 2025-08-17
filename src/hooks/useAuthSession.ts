import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppUser = { id: string; email?: string | null } | null;
type AppSession = { user: AppUser } | null;

export default function useAuthSession() {
  const [user, setUser] = useState<AppUser>(null);
  const [session, setSession] = useState<AppSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data } = supabase.auth.onAuthStateChange((_evt: string, nextSession: AppSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    supabase.auth.getSession().then((res: any) => {
      if (!mounted) return;
      const next = res?.data?.session ?? null;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  return { user, session, loading };
}
