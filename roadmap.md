# Reader fixes
- [x] Fix missing StoreProvider during preview updates and verify Subscriptions.
- [x] Use available space on blog and reading pages.
- [x] Preserve readable feed summaries and prevent stale article content.
- [x] Repair article URL handling and original-link navigation.
- [x] Run regression tests and verify live reading flows.

# Honest discovery data
- [x] Remove invented reader counts, blurbs and "readers also follow" pairings.
- [x] Show each blog's real title, tagline and newest post from its own feed.
- [x] Label counts as submissions and hide them at zero.
- [x] Hide site icons that fail to load.
- [x] Verify Discover in the browser and keep the new rules tested.

# Welcome and optional accounts
- [x] Add a matching landing page and retain guest reader access.
- [x] Enable sign-in/sign-up and private saved profiles.
- [x] Add confirmation, password recovery and session-aware sign-out.
- [x] Verify guest access, account creation, profile persistence, owner-only policies and sign-out. Confirmation delivery and external social-provider completion require a real inbox/provider account.

# Dark mode
- [x] Add a Dark mode switch to Settings and keep the choice on the device.
- [x] Invert the palette lightness for the dark theme without introducing new hues.
- [x] Keep text readable on the bright sage accent and over the landing photo in dark mode.
- [x] Verify the switch, persistence, both themes and a clean console in the preview.

# Rename to READLY
- [x] Replace "Small Web Reader" with READLY in every page title, description and social-preview string.
- [x] Replace the split-word logos in the sidebar, mobile header, public header, welcome sticker, landing headline and footer.
- [x] Rename the exported OPML file and its document title, and the feed-fetching user-agent.
- [x] Keep the IndexedDB name and theme storage key unchanged so saved subscriptions and theme choices survive.
- [x] Verify every page shows READLY with no old name left in the preview.

# Smooth navigation
- [x] Remove entrance delays that hide page controls and prepare visible links before clicking.
- [x] Add brief reader-page motion without delaying interaction or ignoring reduced-motion preferences.
- [x] Verify account tabs and reader navigation in the preview and run regression tests.

# Oversized arrows in articles
- [x] Stop icons and arrows shipped without a size from filling the reading column.
- [x] Keep already-saved articles covered, not just newly fetched ones.
- [x] Verify a fresh article and a saved article in the preview and keep the rules tested.
