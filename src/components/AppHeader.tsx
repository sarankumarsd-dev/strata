import { Link } from "react-router-dom";
import { Crosshair, LogIn } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { AccountMenu } from "@/components/AccountMenu";

export function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-start gap-3 group">
          <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground glow-primary">
            <Crosshair className="h-7 w-7" />
          </div>
          <div className="flex flex-col justify-between" style={{ height: "54px" }}>
            <span className="font-display font-bold" style={{ fontSize: "38px", lineHeight: 1, letterSpacing: "0.04em" }}>
              Stra<span className="text-primary">ta</span>
            </span>
            <span className="text-white font-sans font-medium tracking-widest uppercase opacity-80" style={{ fontSize: "11px", letterSpacing: "0.18em" }}>
              Game strategy at its peak
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <AccountMenu />
              <Link to="/my-strata" className="rounded-md px-4 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                My Strata
              </Link>
            </>
          ) : (
            <Link to="/login" className="rounded-md px-4 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1.5">
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          )}
          <Link to="/forum" className="rounded-md px-4 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            Forum
          </Link>
          <Link to="/maps">
            <Button className="ml-2 px-5 py-2 text-base font-medium btn-silver-shine">Start your strata</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
