import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { buttonVariants, delay, Sticker } from "@/components/brut";
import { useReaderAuth } from "@/lib/auth-context";
import welcomeImage from "@/assets/reader-welcome.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "READLY — Independent blogs, your way" },
    { name: "description", content: "A quiet home for independent blogs. Create an account or read as a guest with READLY." },
    { property: "og:title", content: "READLY — Independent blogs, your way" },
    { property: "og:description", content: "Follow the web, not the algorithm. Your next good read starts here." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Landing,
});
function Landing() {
  const { user } = useReaderAuth();
  return <div className="min-h-screen"><PublicHeader className="rise" />
    <section className="relative isolate overflow-hidden border-b-[3px] border-ink">
      <img src={welcomeImage} width={1600} height={1024} alt="Independent zines, newspapers and a cup of coffee" className="slow-zoom absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-cream/60 sm:bg-cream/30" />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
        {/* In dark the photo is too busy for white text, so the words sit on a solid clipping. */}
        <div className="sm:dark:max-w-3xl dark:border-[3px] dark:border-ink dark:bg-cream dark:p-6 dark:shadow-brut sm:dark:p-10">
        <Sticker tone="pink" className="stamp">For the curious, not the algorithm</Sticker>
        <h1 className="rise mt-6 text-5xl leading-[1.05] sm:mt-7 sm:text-8xl" style={delay(80)}>READLY<span className="text-sage-dark">.</span></h1>
        <p className="rise mt-7 max-w-md text-base leading-7" style={delay(160)}>Good blogs. Real voices. A little more room to think.<br />Follow the web, not the algorithm.</p>
        <div className="rise mt-9 flex flex-wrap gap-4" style={delay(240)}>
          {user ? <Link to="/timeline" className={buttonVariants({ size: "lg" })}>Back to reading<ArrowRight size={20} /></Link> : <Link to="/auth" search={{ mode: "signup" }} className={buttonVariants({ size: "lg" })}>Create an account<ArrowRight size={20} /></Link>}
          <Link to="/timeline" className={buttonVariants({ size: "lg", variant: "secondary" })}>Read as a guest<ArrowUpRight size={20} /></Link>
        </div><p className="rise mt-6 text-xs" style={delay(320)}>Your reading stays on this device. An account is optional.</p>
        </div>
      </div>
    </section>
    <section className="border-b-[3px] border-ink bg-sage-light"><div className="wipe mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-8 sm:px-10" style={delay(380)}>
      <h2 className="text-xl sm:text-3xl">A smaller web.<br />A bigger world.</h2><Link to="/discover" className="flex items-center gap-3 font-display text-sm uppercase underline">Find your next favourite blog<ArrowRight size={24} className="nudge" /></Link>
    </div></section>
    <footer className="rise mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-7 text-xs sm:px-10" style={delay(120)}><span>READLY</span><Link to="/about" className="underline">About & privacy</Link></footer>
  </div>;
}
