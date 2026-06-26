import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasUsername: boolean | null; // null = not yet checked
  refreshUsername: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, loading: true,
  hasUsername: null, refreshUsername: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setHasUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check username whenever session changes
  useEffect(() => {
    if (session?.user) {
      checkUsername(session.user.id);
    }
  }, [session?.user?.id]);

  async function checkUsername(userId: string) {
    // upsert ensures profile row always exists (covers Google OAuth users)
    await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    setHasUsername(!!data?.username);
  }

  async function refreshUsername() {
    if (session?.user) await checkUsername(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setHasUsername(null);
  }

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, hasUsername, refreshUsername, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
