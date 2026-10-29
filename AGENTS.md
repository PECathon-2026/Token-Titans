<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Feeds, posts, articles and read state live only in browser IndexedDB (src/lib/db.ts, src/lib/store.tsx) — optional accounts never upload or sync reading data.
- All feed/article parsing, Readability extraction and DOMPurify sanitizing happen client-side; /api/public/fetch only relays raw bytes (blocks private IPs, timeout, size cap) — keeps the server content-free.
- Discovery tables are reachable only via /api/public/discovery/* server routes using service role + SQL functions; no RLS policies exist, so the Data API can't touch them.
- URL normalization (src/lib/url.ts) is shared by client and server so dedupe and discovery keys match.
- Browser content processing lives in src/lib/content.ts; resolve HTTP(S) URLs and sanitize final markup there so summaries and articles use the same safety rules.
- Keep store context identity and its consumer hook in src/lib/store-context.ts, separate from the provider implementation, so preview refreshes cannot disconnect mounted consumers.
- The public landing page owns `/` and the guest-accessible reader owns `/timeline`; all existing reading routes remain public so optional accounts do not gate reading.
- Authentication uses one root session listener and a stable context module; private profiles use owner-only RLS and a signup trigger so every provider creates a profile without exposing credentials.
- Theme colours live only in src/styles.css (`:root` plus a `.dark` override of the same variables) so every utility flips with one class; surfaces that carry text on the bright sage accent must use the `on-sage` utility, and the reader's theme choice stays device-local in src/lib/theme.ts so it never needs a server round trip.
- Preload visible internal links with the router and keep entrance motion non-blocking, without hidden controls or stagger delays, so navigation responds promptly on touch and desktop.
- Offline app shell: service worker (vite-plugin-pwa generateSW) registered only via src/lib/offline-sw.ts, never in dev/preview — keeps previews from serving stale code.
