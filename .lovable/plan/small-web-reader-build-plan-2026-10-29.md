# Small Web Reader — Build Plan

A neo-brutalist RSS/Atom reader with offline reading and anonymous blog discovery.

## Stack adaptations (required by this project)
- Routing: TanStack Router file routes instead of React Router (same URLs).
- Server: Lovable Cloud database + server routes under `/api/public/*` instead of Edge Functions (same behavior: fetch proxy, submit, recommend, popular).

## Phase 1 — Design system
- Tokens in `src/styles.css`: pink, cream, sage-light, sage-dark, ink, danger red; hard shadows (4px/6px), radius 0–4px, 3px borders.
- Fonts via `<link>`: Archivo Black (headings), Space Mono (body), Source Serif 4 (articles).
- Components: Button (primary/secondary/danger, hover lift, press sink, 100ms), Card, Sticker badge (rotated), Input, Toggle, Checkbox, Modal, Toast (sonner styled), SectionHeader, EmptyState with CSS-shape art, blocky Skeleton and ProgressBar.

## Phase 2 — App shell
- Desktop sidebar (wordmark block, nav, unread badge) / mobile bottom tab bar.
- Top bar: search, ONLINE/OFFLINE sticker, last synced, Refresh. Offline banner.

## Phase 3 — Pages (mock data first, then wired)
Timeline `/`, Add Feed modal, Reading `/read/$postId`, Subscriptions `/subscriptions`, Settings `/settings`, Discover `/discover`, Onboarding `/welcome` (first-run redirect), Feed detail `/feed/$id`, About `/about`, 404 + offline fallback. Each with its own page title/description.

## Phase 4 — Real logic
- Client: autodiscovery (link rel=alternate + /feed, /rss.xml, /atom.xml), RSS/Atom parsing with DOMParser, URL normalization, health states (OK/SLOW/DEAD/MALFORMED), OPML import/export.
- Offline store in IndexedDB (`idb`): feeds, posts, articles, read state, settings; cache-first timeline then background refresh.
- Reading: fetch via proxy, `@mozilla/readability` + `DOMPurify`, summary fallback, auto mark-read, prev/next.
- Fetch proxy route: URL in, raw body out; http(s) only, blocks private/local IPs, 10s timeout, ~2MB cap, no parsing or storage.
- Discovery database: feeds table, anonymous submission batches (co-subscription pairs), rate-limit table with salted IP hashes that expire. Routes: submit (≤50 URLs, normalized, validated, rate-limited), recommend (popularity + co-subscription, excludes followed), popular.
- Seed: 12 starter blogs + pre-populated discovery data inserted in the migration so Discover is never empty.
- Sharing OFF by default; preview + "Submit now" in Settings.

## Technical notes
- No accounts; tables readable only via server routes; no client IDs stored.
- Small tests for URL normalization, private-IP blocking, and submit limits (max 50).
