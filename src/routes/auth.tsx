import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button, delay, Input, buttonVariants } from "@/components/brut";
import { PublicHeader } from "@/components/PublicHeader";
import { useReaderAuth } from "@/lib/auth-context";
import { credentials, profileName } from "@/lib/account-rules";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode: "signin" | "signup" } => ({ mode: s["mode"] === "signup" ? "signup" : "signin" }),
  head: () => ({ meta: [
    { title: "Your account — READLY" }, { name: "description", content: "Sign in or create your READLY account. Guest reading is always available." },
    { property: "og:title", content: "Your account — READLY" }, { property: "og:description", content: "Your own little corner of the small web." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: AuthPage,
});
function errorText(e: unknown) {
  if (e && typeof e === "object" && "issues" in e) return (e as { issues: { message: string }[] }).issues[0]?.message ?? "Check your details.";
  return e instanceof Error ? e.message : "Please try again.";
}
function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, loading, recovery } = useReaderAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const profile = useQuery({ queryKey: ["profile", user?.id], enabled: !!user, queryFn: async () => {
    if (!user) return null;
    const result = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    if (result.error) throw result.error;
    return result.data;
  }});
  useEffect(() => { if (profile.data) setName(profile.data.display_name); }, [profile.data]);
  useEffect(() => { if (recovery) void navigate({ to: "/reset-password" }); }, [recovery, navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (forgot) {
        const validEmail = credentials.shape.email.parse(email);
        const result = await supabase.auth.resetPasswordForEmail(validEmail, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setMessage("If an account exists for this email, a reset link is on its way.");
      } else if (mode === "signup") {
        const input = credentials.parse({ email, password });
        const displayName = profileName.parse(name);
        const result = await supabase.auth.signUp({ ...input, options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin } });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: "/timeline" });
        else setMessage("Check your email to confirm your account, then sign in. You can keep reading as a guest meanwhile.");
      } else {
        const result = await supabase.auth.signInWithPassword({ email: credentials.shape.email.parse(email), password });
        if (result.error) throw result.error;
        await navigate({ to: "/timeline" });
      }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true); setError("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/timeline" });
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError("");
    try {
      await queryClient.cancelQueries(); queryClient.clear();
      const result = await supabase.auth.signOut(); if (result.error) throw result.error;
      await navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return <div className="min-h-screen"><PublicHeader className="rise" /><main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
    <p className="rise mb-5 font-display text-xs uppercase">Your little corner of the web</p>
    <h1 key={user ? "account" : forgot ? "forgot" : mode} className="rise text-3xl sm:text-5xl" style={delay(70)}>{user ? "My account" : forgot ? "Lost your password?" : mode === "signup" ? "Hello, reader." : "Welcome back."}</h1>
    {error && <p role="alert" className="rise mt-6 border-[3px] border-ink bg-danger p-3 text-cream">{error}</p>}
    {message && <p role="status" className="rise mt-6 border-[3px] border-ink bg-sage-light p-4 leading-6">{message}</p>}
    {loading ? <p className="rise mt-6" role="status" style={delay(140)}>Checking account…</p> : user ? <div className="rise mt-8 space-y-6" style={delay(140)}>
      <p className="break-all text-sm">{user.email}</p>
      {profile.isError && <p role="alert">Couldn't load your profile. <Button size="sm" onClick={() => void profile.refetch()}>Retry</Button></p>}
      <form className="space-y-5" onSubmit={async (e) => {
        e.preventDefault(); setError(""); setMessage(""); setBusy(true);
        try {
          const display_name = profileName.parse(name);
          const result = await supabase.from("profiles").update({ display_name }).eq("id", user.id).select("display_name").single();
          if (result.error) throw result.error;
          await queryClient.invalidateQueries({ queryKey: ["profile", user.id] }); setMessage("Profile saved.");
        } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
      }}><label className="block space-y-2"><span className="font-display text-xs uppercase">Display name</span><Input required disabled={profile.isPending || profile.isError} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label><Button disabled={busy || profile.isPending || profile.isError}>Save profile</Button></form>
      <p className="text-xs leading-6">Your account and profile are saved securely. Subscriptions and reading history stay in this browser; they don't sync between devices.</p>
      <div className="flex flex-wrap gap-4"><Link to="/timeline" className={buttonVariants()}>Keep reading<ArrowRight size={18} /></Link><Button variant="secondary" disabled={busy} onClick={() => void signOut()}><LogOut size={16} />Sign out</Button></div>
    </div> : <>
      {!forgot && <div className="rise mt-8 grid grid-cols-2 gap-3" role="tablist" aria-label="Account access" style={delay(120)}>
        <Button role="tab" aria-selected={mode === "signin"} variant={mode === "signin" ? "sage" : "secondary"} onClick={() => { setError(""); setMessage(""); void navigate({ to: "/auth", search: { mode: "signin" } }); }}>Sign in</Button>
        <Button role="tab" aria-selected={mode === "signup"} variant={mode === "signup" ? "pink" : "secondary"} onClick={() => { setError(""); setMessage(""); void navigate({ to: "/auth", search: { mode: "signup" } }); }}>Sign up</Button>
      </div>}
      <form onSubmit={(e) => void submit(e)} className="rise mt-7 space-y-5" style={delay(180)}>
        {mode === "signup" && !forgot && <label className="block space-y-2"><span className="font-display text-xs uppercase">Display name</span><Input required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></label>}
        <label className="block space-y-2"><span className="font-display text-xs uppercase">Email address</span><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
        {!forgot && <label className="block space-y-2"><span className="font-display text-xs uppercase">Password</span><div className="relative"><Input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "signup" ? 8 : undefined} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="pr-14" /><Button type="button" variant="secondary" size="sm" className="absolute right-2 top-1.5 h-8 w-8 border-0 px-0 shadow-none" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</Button></div></label>}
        {mode === "signup" && !forgot && <p className="text-xs">At least 8 characters. Confirm your email to finish signing up.</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : forgot ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}<ArrowRight size={18} /></Button>
      </form>
      <Button variant="secondary" size="sm" className="rise mt-5" style={delay(240)} onClick={() => { setForgot(!forgot); setError(""); setMessage(""); }}>{forgot ? "Back to sign in" : "Forgot password?"}</Button>
      {!forgot && <div className="rise mt-8 space-y-4 border-t-[3px] border-ink pt-7" style={delay(300)}><Button variant="secondary" className="w-full" disabled={busy} onClick={() => void social("google")}>Continue with Google</Button><Button type="button" className="lovable-auth-button w-full" disabled={busy} onClick={() => void social("lovable")}>Continue with Lovable</Button></div>}
      <Link to="/timeline" className="rise mt-8 flex items-center justify-center gap-2 font-display text-xs uppercase underline" style={delay(360)}>Continue as a guest<ArrowRight size={16} /></Link>
    </>}
  </main></div>;
}
