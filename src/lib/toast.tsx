import { useEffect, useState } from "react";

type ToastKind = "default" | "success" | "error";
interface ToastItem { id: number; kind: ToastKind; message: string; description?: string }

let push: ((t: Omit<ToastItem, "id">) => void) | null = null;
let counter = 0;

function emit(kind: ToastKind, message: string, opts?: { description?: string }) {
  push?.({ kind, message, description: opts?.description });
}

export const toast = Object.assign(
  (message: string, opts?: { description?: string }) => emit("default", message, opts),
  {
    success: (message: string, opts?: { description?: string }) => emit("success", message, opts),
    error: (message: string, opts?: { description?: string }) => emit("error", message, opts),
  },
);

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    push = (t) => {
      const id = ++counter;
      setItems((cur) => [...cur, { ...t, id }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 5000);
    };
    return () => { push = null; };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
          style={{
            borderColor:
              t.kind === "success" ? "var(--success)" :
              t.kind === "error" ? "var(--danger)" : "var(--border)",
          }}
        >
          <div className="font-medium">{t.message}</div>
          {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
