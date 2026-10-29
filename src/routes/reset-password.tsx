import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReaderAuth } from "@/lib/auth-context";
import { credentials } from "@/lib/account-rules";
import { PublicHeader } from "@/components/PublicHeader";
import { Button, Input } from "@/components/brut";
export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [
  { title: "Reset password — READLY" }, { name: "description", content: "Set a new password for your READLY account." },
  { property: "og:title", content: "Reset password — READLY" }, { property: "og:description", content: "Securely recover access to your reader account." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ResetPassword });
function ResetPassword() {
  const { user, recovery, loading } = useReaderAuth();
  const navigate = useNavigate();
  const [hashRecovery, setHashRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setHashRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"); }, []);
  const allowed = !!user && (recovery || hashRecovery);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); if (!allowed) return;
    if (password !== confirm) { setError("Passwords don't match."); return; }
    const valid = credentials.shape.password.safeParse(password);
    if (!valid.success) { setError(valid.error.issues[0]?.message ?? "Check your password."); return; }
    setBusy(true);
    try {
      const result = await supabase.auth.updateUser({ password: valid.data });
      if (result.error) throw result.error;
      await navigate({ to: "/timeline" });
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save password."); } finally { setBusy(false); }
  }
  return <><PublicHeader /><main className="mx-auto max-w-lg px-5 py-14"><h1 className="text-3xl sm:text-4xl">A fresh start.</h1>
    {error && <p role="alert" className="mt-5 bg-danger p-3 text-cream">{error}</p>}
    {loading ? <p className="mt-6">Checking reset link…</p> : !allowed ? <p className="mt-6 leading-7">Open the password reset link from your email. If it expired, <Link to="/auth" search={{ mode: "signin" }} className="underline">request a new link</Link>.</p> : <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-5">
      <label className="block space-y-2"><span>New password</span><Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className="block space-y-2"><span>Confirm new password</span><Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
    </form>}
  </main></>;
}
