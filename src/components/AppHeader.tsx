import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { AccountMenu } from "@/components/AccountMenu";

export function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="relative flex items-center gap-3 group">
          <div className="relative h-[60px] w-[170px] shrink-0 -mt-4 -mb-2">
            <div className="absolute inset-0 gun-crystal" style={{ transform: "scaleX(-1) scale(2, 1.7)" }}>
              <img
                src="/m416-glacier.png"
                alt="Strata icon"
                className="h-full w-full object-contain gun-recoil"
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  maskImage: "url(/m416-glacier.png)",
                  WebkitMaskImage: "url(/m416-glacier.png)",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              >
                <div className="gun-shine-bar" />
              </div>
            </div>
            <div className="muzzle-flash absolute" style={{ left: 126, top: 14 }} />
            {[
              { left: 31, top: 21, delay: 0, duration: 3.2 },
              { left: 49, top: 23, delay: 1.4, duration: 4.1 },
              { left: 65, top: 31, delay: 2.6, duration: 3.7 },
              { left: 83, top: 21, delay: 0.7, duration: 4.4 },
              { left: 99, top: 21, delay: 3.3, duration: 3.4 },
              { left: 117, top: 21, delay: 1.9, duration: 4.0 },
              { left: 133, top: 21, delay: 2.2, duration: 3.9 },
            ].map((s, i) => (
              <span
                key={i}
                className="gun-sparkle"
                style={{ left: s.left, top: s.top, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
              />
            ))}
          </div>
          <div className="bullet-glacier absolute" style={{ left: 150, top: 15 }} />
          <div className="flex flex-col justify-between" style={{ height: "54px" }}>
            <span className="relative inline-block w-fit">
              <span className="font-display font-bold text-silver-shine strata-impact" style={{ fontSize: "38px", lineHeight: 1, letterSpacing: "0.04em" }}>
                Stra<span className="text-primary">ta</span>
              </span>
              <span className="smoke-puff absolute" style={{ left: 0, top: -6 }} />
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
            <Button className="ml-2 px-5 py-2 text-base font-medium">Start your strata</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
