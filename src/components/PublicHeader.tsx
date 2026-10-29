import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./brut";
import { useReaderAuth } from "@/lib/auth-context";

export function PublicHeader({ className }: { className?: string }) {
  const { user } = useReaderAuth();
  return <header className={cn("flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink bg-cream px-5 py-5 sm:px-10", className)}>
    <Link to="/" className="flex items-center gap-3 font-display text-sm sm:text-lg"><Rss size={26} aria-hidden /> READLY</Link>
    <nav className="flex items-center gap-4">
      <Link to="/timeline" className="hidden font-display text-xs uppercase underline sm:inline">Reader <ArrowUpRight size={14} className="inline" /></Link>
      <Link to="/auth" search={{ mode: "signin" }} className={buttonVariants({ variant: "pink", size: "sm" })}>{user ? "My account" : "Sign in"}</Link>
    </nav>
  </header>;
}
