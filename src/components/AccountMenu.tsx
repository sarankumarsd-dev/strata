import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/", { replace: true });
    toast.success("Signed out");
  }

  async function handleSwitchAccount() {
    setOpen(false);
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  const displayName = profile?.username ? `@${profile.username}` : user.email?.split("@")[0];
  const initials = (profile?.username ?? user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        {/* Avatar */}
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[10px] font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <span className="max-w-[100px] truncate text-foreground">{displayName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
          {/* Account info */}
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate("/my-strata"); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              My Strata
            </button>

            <div className="my-1 border-t border-border/60" />

            <button
              onClick={handleSwitchAccount}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Switch account
            </button>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
