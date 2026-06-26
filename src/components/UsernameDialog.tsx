import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Input, Label } from "@/components/ui";
import { toast } from "@/lib/toast";

interface Props {
  onDone: () => void;
}

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export function UsernameDialog({ onDone }: Props) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const val = username.trim().toLowerCase();

    if (!val) { setStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) { setStatus("invalid"); return; }

    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", val)
        .maybeSingle();
      setStatus(data ? "taken" : "available");
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  async function handleSave() {
    if (status !== "available" || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim().toLowerCase() })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Welcome, @${username.trim().toLowerCase()}!`);
    onDone();
  }

  const hint = {
    idle: null,
    invalid: { text: "3–20 chars, letters/numbers/underscore only", ok: false },
    checking: null,
    available: { text: `@${username.trim().toLowerCase()} is available!`, ok: true },
    taken: { text: `@${username.trim().toLowerCase()} is already taken`, ok: false },
  }[status];

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/90 backdrop-blur-xl shadow-2xl p-8 space-y-6">
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Choose your username</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is how other players will see you on Strata.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="uname" className="text-sm">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">@</span>
            <Input
              id="uname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_tag"
              className="pl-7 pr-9 font-mono"
              autoFocus
              maxLength={20}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {status === "available" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
              {(status === "taken" || status === "invalid") && <XCircle className="h-4 w-4 text-destructive" />}
            </div>
          </div>
          {hint && (
            <p className={`text-xs ${hint.ok ? "text-green-400" : "text-destructive"}`}>
              {hint.text}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Letters, numbers and underscores · 3–20 characters
          </p>
        </div>

        <Button
          className="w-full gap-2"
          disabled={status !== "available" || saving}
          onClick={handleSave}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Set username
        </Button>
      </div>
    </div>
  );
}
