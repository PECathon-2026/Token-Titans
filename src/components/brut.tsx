import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { faviconFor } from "@/lib/feeds";

/** Site icon that vanishes instead of showing a broken frame when a site publishes none. */
export function Favicon({ siteUrl, className }: { siteUrl: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!siteUrl || !ok) return null;
  return <img src={faviconFor(siteUrl)} alt="" loading="lazy" className={className} onError={() => setOk(false)} />;
}

/** Per-element start delay for the .rise/.stamp/.wipe entrance animations in styles.css. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export const buttonVariants = cva(
  "brut brut-press inline-flex items-center justify-center gap-2 font-display uppercase tracking-tight select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        primary: "on-sage",
        secondary: "bg-cream text-ink",
        pink: "bg-pink text-ink",
        sage: "bg-sage-light text-ink",
        danger: "bg-danger text-cream",
        ink: "bg-ink text-cream",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-11 px-5 text-sm", lg: "h-14 px-7 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>>(
  ({ className, variant, size, ...p }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...p} />,
);
Button.displayName = "Button";

export function Card({ className, interactive, large, ...p }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean; large?: boolean }) {
  return <div className={cn(large ? "brut-lg" : "brut", "bg-cream", interactive && "brut-press", className)} {...p} />;
}

const stickerTones = {
  ink: "bg-ink text-cream",
  pink: "bg-pink text-ink",
  sage: "on-sage",
  light: "bg-sage-light text-ink",
  cream: "bg-cream text-ink",
  danger: "bg-danger text-cream",
};
export function Sticker({ tone = "pink", className, rotate = -2, children }: { tone?: keyof typeof stickerTones; className?: string; rotate?: number; children: ReactNode }) {
  return (
    <span className={cn("sticker", stickerTones[tone], className)} style={{ transform: `rotate(${rotate}deg)`, "--r": `${rotate}deg` } as CSSProperties}>
      {children}
    </span>
  );
}

export function HealthSticker({ health }: { health: string }) {
  const tone = health === "OK" ? "sage" : health === "SLOW" ? "pink" : health === "PENDING" ? "cream" : "danger";
  const label = health === "DEAD" ? "DEAD FEED" : health;
  return <Sticker tone={tone}>{label}</Sticker>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("brut h-11 w-full bg-cream px-3 font-mono text-sm placeholder:text-ink/50", className)} {...p} />
));
Input.displayName = "Input";

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("brut relative h-10 w-20 shrink-0 cursor-pointer transition-colors duration-100", checked ? "on-sage" : "bg-pink")}
    >
      <span className={cn("absolute top-1 h-6 w-7 border-[3px] border-ink bg-cream transition-all duration-100", checked ? "left-[42px]" : "left-1")} />
      <span className={cn("absolute top-1/2 -translate-y-1/2 font-display text-[10px]", checked ? "left-2" : "right-2")}>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; className?: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 font-display text-xs uppercase", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex h-6 w-6 items-center justify-center border-[3px] border-ink bg-cream shadow-brut-sm peer-focus-visible:outline-[3px] peer-focus-visible:outline-ink peer-focus-visible:outline-offset-2">
        {checked && <span className="h-3 w-3 bg-ink" />}
      </span>
      {label}
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[10vh]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="brut-lg w-full max-w-xl bg-cream" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-pink px-4 py-3">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="brut brut-press h-8 w-8 bg-cream font-display">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function SectionHeader({ children, tone = "bar", right }: { children: ReactNode; tone?: "bar" | "pink" | "sage"; right?: ReactNode }) {
  if (tone === "bar")
    return (
      <div className="mb-5 flex items-end justify-between gap-3 border-b-[6px] border-ink pb-2">
        <h2 className="text-xl md:text-3xl">{children}</h2>
        {right}
      </div>
    );
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className={cn("brut inline-block px-4 py-2 text-xl md:text-2xl", tone === "pink" ? "bg-pink" : "on-sage")}>{children}</h2>
      {right}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <Card large className="flex flex-col items-center gap-6 px-6 py-12 text-center">
      <div className="relative h-28 w-36" aria-hidden>
        <div className="absolute left-0 top-6 h-20 w-20 border-[3px] border-ink bg-sage-light" />
        <div className="absolute left-12 top-0 h-16 w-16 rounded-full border-[3px] border-ink bg-pink" />
        <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[56px] border-l-[32px] border-r-[32px] border-b-ink border-l-transparent border-r-transparent" />
      </div>
      <h2 className="text-3xl md:text-5xl">{title}</h2>
      {body && <p className="max-w-md">{body}</p>}
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </Card>
  );
}

export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("skel border-[3px] border-ink", className)} />;
}

export function ProgressBlocks() {
  return <div className="brut progress-blocks h-6 w-full" role="progressbar" aria-label="Working" />;
}

export function Callout({ tone = "pink", title, children }: { tone?: "pink" | "sage" | "danger"; title: string; children?: ReactNode }) {
  return (
    <div className={cn("brut p-4", tone === "pink" ? "bg-pink" : tone === "sage" ? "bg-sage-light" : "bg-danger text-cream")}>
      <p className="font-display uppercase">{title}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}
