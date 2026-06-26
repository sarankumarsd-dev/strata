import * as React from "react";
import { cn } from "@/lib/cn";

/* ---------------- Button ---------------- */
type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "default" | "sm" | "lg" | "icon";

const variantCls: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
};
const sizeCls: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 rounded-md px-6 text-base",
  icon: "h-9 w-9",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/* ---------------- Input ---------------- */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-input/40 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/* ---------------- Textarea ---------------- */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex w-full rounded-md border border-input bg-input/40 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

/* ---------------- Label ---------------- */
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium leading-none", className)} {...props} />
  ),
);
Label.displayName = "Label";

/* ---------------- Slider (native range) ---------------- */
export function Slider({
  value, min = 0, max = 1, step = 0.01, onValueChange, className,
}: {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (v: number[]) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={cn("w-full accent-[var(--primary)] cursor-pointer", className)}
    />
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

/* ---------------- Select (native) ---------------- */
interface SelectCtx { value: string; onValueChange: (v: string) => void }
const SelectContext = React.createContext<SelectCtx | null>(null);

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  // Collect <SelectItem> options from children tree.
  const options: { value: string; label: React.ReactNode }[] = [];
  function walk(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      const el = child as React.ReactElement<any>;
      if (el.type === SelectItem) {
        options.push({ value: el.props.value, label: el.props.children });
      } else if (el.props && el.props.children) {
        walk(el.props.children);
      }
    });
  }
  walk(children);

  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex h-9 w-full items-center rounded-md border border-input bg-input/40 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {typeof o.label === "string" ? o.label : o.value}
            </option>
          ))}
        </select>
      </div>
    </SelectContext.Provider>
  );
}
// API-compatible no-op wrappers (native <select> handles rendering)
export function SelectTrigger({ children }: { children?: React.ReactNode; className?: string }) { return <>{children}</>; }
export function SelectValue(_: { placeholder?: string }) { return null; }
export function SelectContent({ children }: { children?: React.ReactNode; className?: string }) { return <>{children}</>; }
export function SelectItem(_: { value: string; children?: React.ReactNode }) { return null; }

/* ---------------- Tooltip (CSS hover) ---------------- */
export function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) { return <>{children}</>; }
export function Tooltip({ children }: { children: React.ReactNode }) {
  return <span className="group/tt relative inline-flex">{children}</span>;
}
export function TooltipTrigger({ children }: { asChild?: boolean; children: React.ReactNode }) { return <>{children}</>; }
export function TooltipContent({ children, side = "top" }: { children: React.ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  const pos = side === "right"
    ? "left-full top-1/2 -translate-y-1/2 ml-2"
    : "bottom-full left-1/2 -translate-x-1/2 mb-2";
  return (
    <span className={cn(
      "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover/tt:block",
      pos,
    )}>
      {children}
    </span>
  );
}
