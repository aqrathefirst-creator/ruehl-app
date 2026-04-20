# Ruehl Web — Locked Design Direction

This document is the **north star** for web catch-up work against **`ruehl-native`**. It incorporates **`AUDIT_DRIFT.md`**, sampled native surfaces (`App.tsx`, `HomeFeedScreen.tsx`, `ExploreScreen.tsx`, `ProfileScreen.tsx`, `IdentityScreen.tsx`, libs), **`ruehl-app`** route inventory + `app/globals.css`, and **`ruehl-native/app/globals.css`** / **`app.json`**.

---

## 1. Positioning

Ruehl **is where real ones live**: a **voice-and-identity-first** social graph, not video-first like TikTok and not photo-first like Instagram. Creation and credibility live in **voice, POWR thoughts, lifts, echoes, alignment, identity, and sound**—not in generic scroll aesthetics. **Web is the desktop companion** to the native app: users should browse **profiles**, read **feeds**, view **POWR posts**, use **lifts**, tune **settings**, and complete **verification / admin review** on large screens. **Voice-native creation**—**DROPS**, **voice strips**, **Echo recording**, **Echo threads on posts**—stays **mobile-first**; web supports **playback** and **read-only** surfaces where noted below, with clear **“Open in app”** paths when recording is required.

---

## 2. Layout System (LOCKED)

Desktop follows an **Instagram-style three-column** shell, tuned to Ruehl’s dark, violet-forward brand (see §3).

### Columns

| Region | Behavior |
|--------|----------|
| **Left nav rail** | Fixed width **~240px expanded**, **~72px collapsed** on narrower desktops. Persistent global navigation. **Items:** **Home**, **Now**, **Sessions**, **Search** (Explore), **Create** (opens modal — web create **limited to photo / text / POWR-text**; **voice requires mobile**), **Messages**, **You** (profile), **Admin** (if `users.is_admin`). |
| **Center column** | Main scrollable content. **Max width 600px** on feed routes (Home / Now); **960px** on profile and post-detail routes. Scroll is **independent** of rails. |
| **Right rail** | **340px** fixed width, **context-aware**: on **Home** → **Now / Trending** + **Suggested profiles**; on **Profile** → **Current sound** + **Suggested similar**; on **Post detail** → **Related posts by creator**. |

### Responsive breakpoints

| Range | Layout |
|-------|--------|
| **≥1440px** | Full 3-column; left rail **expanded** |
| **1280–1439px** | 3-column; left rail **collapsed** (icons + tooltips) |
| **1024–1279px** | **2-column**: left rail + center; **right rail hidden** |
| **768–1023px** | Left rail becomes **top bar**; content **full width** |
| **<768px** | **Single column** + **bottom nav** (current pattern, cleaned up for parity) |

### ASCII diagram (desktop ≥1280px)

```
┌──────────────┬────────────────────────────┬──────────────────┐
│              │                            │                  │
│   LEFT NAV   │      CENTER (feed /        │   RIGHT RAIL     │
│   ~240px     │       profile / post)      │   340px          │
│   fixed      │       max 600 / 960        │   contextual     │
│              │                            │                  │
│              │        (scroll)            │     (scroll)     │
│              │                            │                  │
└──────────────┴────────────────────────────┴──────────────────┘
```

---

## 3. Design Tokens

**Source of truth:** values below are **lifted from `ruehl-native`** (`App.tsx`, `ProfileScreen.tsx`, `IdentityScreen.tsx`, `ExploreScreen.tsx`, `MusicPicker.tsx` / `SoundDetailScreen.tsx` Spotify affordances, `app/globals.css`, `app.json`, `components/discoveryStripTokens.ts`). There is **no `tailwind.config`** in **`ruehl-app`** today (Tailwind v4 + `@import "tailwindcss"` in `globals.css`); web should **map these tokens into CSS variables / Tailwind theme** in implementation phases—not invent a second palette.

### Color tokens

| Name | Value | Used for (native reference) |
|------|-------|-----------------------------|
| `bg.primary` | `#000000` | `App.tsx` `COLOR_BG`; `app.json` splash; `app/globals.css` `html, body` |
| `bg.secondary` | `#0d0d0d` | Profile tab/chip areas (`ProfileScreen`), cards |
| `bg.tertiary` | `#101010` / `#111` | Layered panels, skeleton placeholders |
| `bg.elevated` | `#1a1a1a` | Skeleton / placeholder blocks |
| `text.primary` | `#ffffff` | Primary headlines, nav active (`COLOR_TEXT`) |
| `text.secondary` | `rgba(255,255,255,0.65)`–`0.75` | Body on cards |
| `text.muted` | `rgba(255,255,255,0.4)` | Nav inactive (`COLOR_TEXT_MUTED`); secondary labels |
| `text.meta` | `rgba(255,255,255,0.35)`–`0.38` | Identity tip, tertiary copy |
| `text.caption` | `rgba(255,255,255,0.3)` | Small caps labels (e.g. LIFTS / SCROLL BACKS row, `IdentityScreen`) |
| `border.subtle` | `rgba(255,255,255,0.08)` | Bottom nav border (`NAV_BORDER`) |
| `border.medium` | `rgba(255,255,255,0.16)`–`0.22` | Avatar ring outer wash, dividers |
| `accent.violet` | `#7c3aed` | Primary CTA fill (follow / action buttons on profile) |
| `accent.violet.bright` | `#a855f7` | Tab underline active (`ProfileScreen`) |
| `accent.lift` | `#8b5cf6` | Lift active state (`ProfileScreen` modal) |
| `accent.spotify` | `#1ed760` | **“Open in Spotify”** / external music open (`MusicPicker`, `SoundDetailScreen`) — treat as **success / external-open** accent |
| `accent.verify` | `#4FC3F7` | Verified check icon (`ProfileScreen`, `ExploreScreen`, `IdentityScreen`) |
| `semantic.error` | `#ef4444` | Delete / report destructive actions |
| `semantic.warning.text` | `#ff8f8f` / `#ffb3b3` | Preview-unavailable / soft errors (`MusicPicker`) |
| `creator.signal.bg` | `rgba(138,43,226,0.06)` | Identity “creator signal” panel (`IdentityScreen`) |
| `creator.signal.border` | `rgba(138,43,226,0.2)` | Same panel border |
| `creator.signal.chip.bg` | `rgba(138,43,226,0.2)` | Chips in that panel |
| `gradient.identity.footer` | `transparent` → `#060606` | Bottom fade on identity hero (`IdentityScreen` `LinearGradient`) |
| `avatar.ring` | `rgba(255,255,255,0.16)` | Profile avatar outer ring wash (`ProfileScreen` — **not** a literal purple-pink gradient in current RN; Identity uses **violet creator-signal** panels separately) |

### Typography

| Name | Value | Used for |
|------|-------|----------|
| **Font stack** | System UI (RN: San Francisco / Roboto via platform) | Default for native |
| **Web interim** | `Arial, Helvetica, sans-serif` (`ruehl-app/app/globals.css` `:root`) | Until web loads a chosen font matching native feel |
| `text.title` | **18px** | `.text-title` — `ruehl-native/app/globals.css` |
| `text.username` | **14px** | `.text-username` |
| `text.caption` | **13px** | `.text-caption`; bio body on profile |
| `text.meta` | **11px**, opacity **0.65** | `.text-meta` |
| `identity.username` | **26px**, weight **800** | `IdentityScreen` hero |
| `profile.username` | **34px** weight **800** (initial glyph) | Avatar fallback |
| `stats.value` | **22px** weight **800** | Identity stats row |
| `stats.label` | **9px**, letter-spacing **1.5**, color `rgba(255,255,255,0.3)` | LIFTS / SCROLL BACKS / ECHOES / ALIGNED |

Weights in use: **600**, **700**, **800** for emphasis (buttons, labels, stats).

### Spacing scale (from native constants)

| Token | Value | Source |
|-------|-------|--------|
| `space.page` | **16px** | `HomeFeedScreen` `PAGE_PADDING`; `ProfileScreen` `H_PADDING` |
| `discovery.marginY` | **6px** | `discoveryStripTokens.ts` |
| `discovery.padX` | **12px** | `DISCOVERY_HORIZONTAL_PADDING` |
| `discovery.padY` | **4px** | `DISCOVERY_VERTICAL_PADDING` |
| `discovery.gap` | **12px** | `DISCOVERY_ITEM_GAP` |
| `discovery.tileWidth` | **152px** | `DISCOVERY_TILE_WIDTH` |

Use **4 / 8 / 12 / 16 / 24** as the implied rhythm (native leans **16** for screen gutters).

### Border radii

| Token | Value | Used for |
|-------|-------|----------|
| `radius.avatar.outer` | **45px** (90×90 outer) | `PROFILE_AVATAR_RADIUS_OUTER` |
| `radius.avatar.inner` | **42px** (84×84 inner) | `PROFILE_AVATAR_RADIUS_INNER` |
| `radius.pill` | **999** | Chips / compact buttons |
| `radius.card` | **22px** | Creator signal card (`IdentityScreen`) |
| `radius.media` | **8px** | Explore grid thumbnails |
| `radius skeleton` | **7px / 5px** | Loading placeholders |

### Shadows / glows

`ruehl-native/app/globals.css` forces **`* { box-shadow: none !important; }`** for web preview—**native RN uses minimal elevation**; prefer **flat layers + borders** over heavy shadows. Optional **glow** only where native already uses it (e.g. tab cutout / FAB in `App.tsx` references **shadowColor `#d1d5db`** for a specific control—treat as **exception**, not default).

---

## 4. Surface Map — Web vs Native

**Legend:** ✓ shipped · ◐ partial / in progress · ✗ not applicable · **(t)** target per this doc  

| Surface | Native | Web | Notes |
|---------|--------|-----|-------|
| Home feed | ✓ | ✓ | Desktop: center column; pair with right-rail Now/Trending when built |
| Now (live/trending stack) | ✓ | ◐ (`/now`) | Align cards with `HomeNowFeedCard` / Now semantics |
| Profile | ✓ | ✓ (`/profile/[id]`, `/[username]`) | Must match **account type**, **verification**, **identity / tagline**, **current sound** |
| Identity (Tagline) | ✓ | ✗ | Parity target: Identity vs Profile distinction as on native |
| Post detail | ✓ | ◐ | Deep links / modals on native; web needs dedicated route + **related posts** rail |
| POWR post | ✓ | ◐ | Web: **read** + **text POWR create** (`/create`, `/powr`); **voice POWR** = mobile |
| Voice strip | ✓ | **(t)** play-only | Use `VoiceStrip`-like player; no record |
| DROPS | ✓ | **(t)** view-only during live window | View-only during 30-min live window — no Lift, Share, or Echo interactions yet (interaction UX to be designed separately). Ended drops kept as POWR posts get normal post interactions. |
| Echoes (voice replies) | ✓ | **(t)** play-only | Play-only on web. Thread is viewable; recording is mobile-only. |
| Text comments (legacy UI) | ◐ | ◐ | Native post modal still exposes heart/comment patterns in places—brand voice prefers **Echo** for voice; align copy in refactor |
| Chat / DMs | ✓ | ◐ | **Target ✓**; web currently **no `/messages` inbox** — ship inbox + thread (Supabase realtime per **`20260442_messaging_realtime.sql`** in native migrations) |
| Sessions | ✓ | ✓ (`/sessions`) | Web map affordances are a strength |
| Search / Explore | ✓ | ✓ (`/explore`) | Desktop: denser grid; reuse discovery strip spacing tokens |
| Charts / Trending | ✓ | ✓ (`/charts`) | Right-rail “Trending” module should echo charts discovery |
| Stories | ✓ | **(t)** view-only | View-only on web — creation is mobile-only. Users can browse other users' stories. |
| Notifications | ✓ | ✓ (`/notifications`) | — |
| Settings | ✓ | ✓ (`/settings`) | Parity: **Account Type**, **Verification**, **Profile Display** fields |
| Edit profile | ✓ | ◐ (`/edit-profile`) | Must expand to native field set |
| Saved sounds | ✓ | ◐ (`/saved-sounds`) | — |
| Sound detail | ✓ | ◐ (`/sound/[id]`) | Align with Spotify open affordance `#1ed760` |
| Followers / Following | ✓ | ✓ (`/followers`, `/following`) | Copy: prefer **Aligned / Tuned In** where native does—see §8 |
| Onboarding username | ✓ | ✓ | — |
| Verify account (email) | ✓ | ✓ | Distinct from **business/media verification** |
| Admin | — | ✓ (`/admin`) | **Desktop-first** institutional console |
| DROPS admin / moderation | — | **(t)** ✓ | Web-only ops surfaces for scheduled/live drops & echoes policy |
| Session room chat | ◐ | ◐ (`/room/[id]`) | Session-scoped chat; not DM |

---

## 5. Component Primitives (must match native semantics)

Checklist: each item lists **props** and **data sources** (tables / APIs). Implementation comes in phased work—this section locks **meaning**.

| Primitive | Props (minimum) | Data source |
|-----------|-------------------|-------------|
| **ProfileHeader** | `userId`, `avatarUrl`, `username`, `identityText` / tagline, `bio`, `isVerified` (legacy), `badgeVerificationStatus`, `accountType`, `accountCategory`, `displayCategoryLabel`, `stats` ({ lifts, scrollBacks, echoes, alignment }), `isOwnProfile`, `onFollow`, `onOpenIdentity`, `onEdit` | `profiles` + `users` (+ resolve functions) |
| **CurrentSoundCard** | `trackTitle`, `artistName`, `artworkUrl`, `previewUrl?`, `onOpenExternal`, `compact?` | `licensed_tracks` / post sound resolution (`postSoundResolver` pattern) |
| **PostCard** | `post`, `creator`, `media`, `liftCount`, `echoCount`, `scrollBackCount`, `onLift`, `onOpenEchoes`, `onOpenIdentity` | `posts`, engagement metrics, `post_lifts`, `echoes` |
| **POWRCard** | `content`, `voiceUrl?`, `isPowr`, `author`, `onPlayVoice` | `posts` (POWR detection via `isPowrPost` logic) |
| **VoiceStripPlayer** | `audioUrl`, `durationSec`, `caption?`, `waveform?` (optional visual) | Storage URLs on `posts` |
| **LiftButton** | `lifted`, `count`, `onToggle` | **`post_lifts`** (not likes) |
| **VerificationBadge** | `badgeVerificationStatus` (`pending` / `approved` / `rejected` / null), `size` | **`profiles.badge_verification_status`** (synced from submissions) |
| **AccountTypeChip** | `accountType`, `accountCategory`, `showLabel` | **`accountTypes.ts`** labels + DB fields |
| **NavRail** | `collapsed`, `items`, `currentPath`, `isAdmin`, `onCreate` | Auth + `users.is_admin` |
| **RightRail** | `variant: 'home' \| 'profile' \| 'post'`, slot props | Contextual queries (trending, suggestions, related) |
| **TopBar** | `title`, `onMenu`, `actions` | `<768px` / tablet |
| **BottomNav** | mirror native tab semantics | `<768px` only |

---

## 6. What NOT to Build on Web (explicitly)

- **Voice recording** for **DROPS**, **Echo creation**, **voice strip creation** — **mobile-only**; web surfaces **“Open in app”** deep links (`ruehl://…` / store URLs as product decides).
- **Camera capture flows** — mobile-only (stills/video capture for feed).
- **Push notification registration** — mobile-only (APNs / FCM).
- **Trusted devices** — **native security concept**; browsers use sessions / optional WebAuthn later—not parity.
- **Haptics** — N/A on web.
- **DROPS interactions** (Lift / Share / Echo on live drops) — **view-only** on web for now; interaction UX deferred until a later phase.
- **Story creation** — **mobile-only**; web is **view-only**.

This section exists to **prevent scope creep**: web is a **companion**, not a full replacement for capture-time experiences.

---

## 7. Data Model Alignment

- **`verification_requests` → `verification_submissions`:** Web APIs and UI (`/api/verification-requests`, `/api/admin/verification`, settings) must migrate to native’s **`verification_submissions`** + **`verification-documents`** bucket (`lib/verification.ts`).
- **Profiles/Users parity:** Read **`account_type`**, **`account_category`**, **`badge_verification_status`**, **`contact_email`**, **`contact_phone`**, **`website`**, **`display_category_label`**, **`display_contact_info`** on **`users` and `profiles`** (mirrored columns per native migrations).
- **`is_admin`:** Production aligns with **`public.users.is_admin`** from **`20260419000001_verification_system.sql`**. Web admin routes that read **`profiles.is_admin`** must be **reconciled** against this (AUDIT flagged drift).
- **Single Supabase project:** **`ymtzinhbzbsupbdmbjxg`** (`supabase/.temp/project-ref`). **`ruehl-app/supabase/migrations`** is **not** the operational source of truth vs deployed DB—**native migrations** are; web’s folder should be **treated as legacy / cleanup** and reconciled in a dedicated migration-hygiene phase (per **`AUDIT_DRIFT.md`**).
- **API host (authoritative):** **`project-rmo1v.vercel.app`** is the authoritative API host for both **`ruehl-app` (web)** and **`ruehl-native` (mobile)**. Spotify search proxy and any other **`/api/spotify/*`** routes live there. Web should ensure its route handlers are **deployed to that Vercel project**, not a separate one.

---

## 8. Brand Voice & Copy Principles

- **Marketing / hero tagline:** **“Ruehl is where real ones live.”**
- **Endorsement:** **Lift / Lifted** — not “Like” for the endorsement mechanic (native uses **Lift** with purple affordance `#8b5cf6` in places).
- **Voice replies:** **Echoes** — not generic “comments” in user-facing copy for voice threads.
- **Return visits:** **Scroll Backs** — label matches `IdentityScreen` stats row.
- **Verification:** **“Verified on Ruehl”** / status text from `getVerificationStatusLabel` patterns in native (`lib/verification.ts`).
- **Social graph language:** Prefer **Aligned**, **Tuned In**, and native-specific labels over generic **followers/following** **when native copy does**—exact strings should be **ported from native** (`ExploreScreen`, `ProfileScreen`, settings) rather than reinvented.
- **DROPS:** A Drop is a **live voice moment** — time-bound, **30-minute Echo window**, not a persistent archive. Web reflects this by showing **live drops as viewable moments**, not as a permanent feed of past drops.

---

## 9. Phased Migration Order (reference)

Mirror of the agreed sequencing (implementation phases):

- **2.1** Desktop shell (§2 layout + tokens §3)
- **2.2** Port **`lib`** foundations (`accountTypes`, `verification`, shared post/profile types)
- **2.3** Profile page parity (**ProfileHeader**, current sound, account type chips)
- **2.4** Fix broken admin (**verification queue**, **`is_admin`**, submissions)
- **2.5** Home feed + **right rail** (Now/Trending/suggestions)
- **2.6** Post / POWR / Search / Settings parity
- **2.7+** DROPS **read-only** surfaces, Echoes **read-only**, Messages **parity**

---

## 10. Resolved Decisions (Session Log)

The following design decisions were resolved with AQRA during the Phase 2.0 review. They are now locked and embedded in the relevant sections above. This log exists for traceability.

- **DROPS on web:** View-only during live window. No Lift / Share / Echo interactions yet — deferred pending dedicated interaction UX design.
- **DMs on web:** Full-page desktop threads (`/messages`, `/messages/[threadId]`), IG-style — not an overlay.
- **Charts & Explore:** Both remain as top-level nav items for now. Consolidation into a single discovery surface may be revisited post-launch.
- **Legacy web-only routes** (`/nutrition`, `/train`, `/ranking`, `/matches`, `/requests`): To be removed in Phase 2.1 — see §11.
- **API host:** `project-rmo1v.vercel.app` is authoritative for web + native. Spotify search lives there.
- **Echoes on web:** Play-only, no recording. Consistent with DROPS view-only principle.
- **DROPS schedule lead time:** 0 minutes minimum / 365 days maximum — matches the native client and DB constraint as of session 2026-04-19.
- **Stories on web:** View-only. Users can browse others' stories; creation is mobile-only.

---

## 11. Deprecated Web Surfaces

The following routes were part of an earlier product direction and do not exist in **`ruehl-native`**'s core loop. They will be removed from **`ruehl-app`** during **Phase 2.1** (desktop shell) to reduce confusion and surface area:

- `/nutrition`
- `/train`
- `/ranking`
- `/matches`
- `/requests`

Any API routes (`app/api/*`) and components exclusively tied to these pages should also be removed. Admin surfaces that reference these concepts should be hidden.

---

End of WEB_DIRECTION.md — locked Phase 2.0. Amendments require deliberate design review. Last updated: resolved open questions, session 2026-04-19.
