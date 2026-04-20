# Infrastructure & Third-Party Integrations Audit

## Methodology note

This document is the result of a **read-only** audit of **`ruehl-app`** (`/Users/mohammedaqra/ruehl-app`) and **`ruehl-native`** (`/Users/mohammedaqra/ruehl-native`). **No repository files were modified**, no builds or installs were run, no git commands were executed, and **no secret values** appear below—only **presence/absence** of named environment variables (from variable-name-only enumeration of `.env` files where available) and code references. **Credential material must be treated as opaque** in dashboards; this report does not establish that any key is valid, rotated, or correctly scoped on Vercel/EAS/Supabase.

---

## 1. Service Inventory (summary table)

| Service | Purpose | Web expects (env vars) | Native expects (env vars) | Configured in `ruehl-app/.env.local` | Configured in `ruehl-native/.env` | Referenced in code (y/n + file count) | Launch blocker? |
|--------|---------|------------------------|---------------------------|--------------------------------------|-----------------------------------|----------------------------------------|-----------------|
| **Supabase** (Auth, DB, Realtime, Storage) | Core backend; single project ref documented as `ymtzinhbzbsupbdmbjxg` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server: `SUPABASE_SERVICE_ROLE_KEY` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`; optional `NEXT_PUBLIC_*` in a few files; Expo `backend/`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` | **Present:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; **also present (duplicate intent):** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Present:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Y** — web: ~10+ files for public keys + server helpers; native: `supabase.ts`, screens/services broadly | **🔴** if URL/anon missing on client; **🔴** if service role missing for OTP/admin routes |
| **Resend** | Email OTP (`/api/auth/otp/send`) | `RESEND_API_KEY`; `OTP_FROM_EMAIL` or `RESEND_FROM_EMAIL` | — | **Present:** `RESEND_API_KEY`, `OTP_FROM_EMAIL` | **Absent** | **Y** — `app/api/auth/otp/send/route.ts` | **🔴** for email OTP path if misconfigured (route returns 503 when provider incomplete) |
| **Spotify Web API** | Track search / previews; OAuth client-credentials flow | No dedicated `SPOTIFY_*` vars in **`ruehl-app`** scan | Native app + proxies: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`; calls go to `${EXPO_PUBLIC_API_URL}/api/spotify/search` etc. | **Absent** | **Present:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | **Y** — native: `backend/index.js`, `pages/api/spotify/search.js`, `services/spotifySearch.ts`, UI surfaces | **🔴** if native relies on **`/api/spotify/search`** on deployed host but that route is absent from **`ruehl-app`** tree (see §5). Keys on device/backend still required for proxy |
| **Deezer API** | Fallback preview lookup (public `api.deezer.com` in native Next API route) | — | Used inside **`ruehl-native/pages/api/spotify/search.js`** without API key | — | — | **Y** — 1 file | **🟢** — no env key in code path audited |
| **Giphy** | GIF picker (`GifPicker.tsx`) | — | `EXPO_PUBLIC_GIPHY_API_KEY` | — | **Present:** `EXPO_PUBLIC_GIPHY_API_KEY` | **Y** — `components/GifPicker.tsx` | **🟡** — picker warns / degrades if key empty |
| **Tenor** | Chat URLs detected (`giphy.com|tenor.com`) but no Tenor SDK env | — | — | — | — | **Y** — reference only in `ChatScreen.tsx` | **🟢** |
| **Vercel** | Hosting for Next.js (`ruehl-app`); native uses HTTP base URL | **Implicit:** `VERCEL_PROJECT_PRODUCTION_URL` (OTP secret fallback in `lib/server/otp.ts`); no `vercel.json` in repo | **`EXPO_PUBLIC_API_URL`** (base URL for REST calls to deployed Next/API) | **Absent** var name (often auto-injected on Vercel for builds) | **Present:** `EXPO_PUBLIC_API_URL` | **Y** — native multiple; web OTP fallback only | **🟡** — deployment wiring ambiguous vs **`project-rmo1v.vercel.app`** (see §3 / §5) |
| **GitHub** | Source remotes | — | — | — | — | **Y** — `.git/config` in both repos | **🟢** |
| **EAS / Expo** | Native builds, OTA metadata | — | Project id in `app.json` → `extra.eas.projectId`; CLI version in `eas.json` | — | — | **Y** — `eas.json`, `app.json` | **🟢** for infra audit |
| **Apple / APNs** | Push (product deferred on web per `WEB_DIRECTION.md` §6) | — | No `expo-notifications` / APNs env strings surfaced in audited grep sample | — | — | **N** in env scan | **🟢** (explicitly out of scope for web) |
| **Google / FCM** | Android push | — | Not surfaced in audited env grep | — | — | **N** | **🟢** |
| **CDN / object storage** | Media served via Supabase Storage URLs | — | Native `validatePostStorageUrl.ts` rejects arbitrary CDNs | — | — | **Y** — Storage paths | **🟢** deferred |
| **Analytics** | Product analytics | — | — | — | — | **N** — no Posthog/Segment/Mixpanel/GA/Amplitude imports found in audited greps | **🟢** |
| **Error monitoring** | Sentry / Datadog / Rollbar | — | — | — | — | **N** | **🟢** |
| **AI APIs** | Moderation / features | — | — | — | — | **N** | **🟢** |
| **Payments** | Stripe / RevenueCat | — | — | — | — | **N** | **🟢** |
| **SMS** | Twilio dedicated | — | Supabase Auth can use phone channels; no `TWILIO_*` env in scan | — | — | **🟢** implicit via Supabase | **🟢** |
| **Maps / location** | Leaflet + OSM (`leaflet`, `react-leaflet` in **`ruehl-app`** deps) | No Mapbox/Google Maps API keys in env scan | — | — | — | **Y** — web deps | **🟢** (no tokened provider found) |
| **OTP signing** | HMAC secret for custom OTP (`lib/server/otp.ts`) | `OTP_SIGNING_SECRET` (optional); fallback chain includes service role / public vars | — | **Absent** | — | **Y** — `lib/server/otp.ts` | **🟡** — falls back to hashed public material or weak default string if unset (security risk; see §5) |
| **Admin bootstrap** | `/api/admin/create-admin` allowlist | `ADMIN_ROOT_ALLOWLIST` | — | **Absent** | — | **Y** — `app/api/admin/create-admin/route.ts` | **🟡** |
| **Site URLs** | Redirects / password reset links | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | — | **Absent** | — | **Y** — `lib/authRedirect.ts`, `app/api/admin/reset/route.ts` | **🟡** — falls back to request origin in reset route |
| **App version display** | Settings / `/api/about` | `NEXT_PUBLIC_APP_VERSION` | — | **Absent** | — | **Y** — `app/settings/page.tsx`, `app/api/about/route.ts` | **🟢** — defaults to `0.1.0` |

---

## 2. Env Var Reference Matrix

### `ruehl-app` (Next.js — `process.env.*`)

| Env var | Files that read it (count) | Example file | Purpose | Present in `.env.local`? |
|---------|----------------------------|--------------|---------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 4 | `lib/supabase.ts` | Browser + server Supabase client URL | **Present** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 4 | `lib/supabase.ts` | Browser + server anon key | **Present** |
| `SUPABASE_SERVICE_ROLE_KEY` | 2 | `lib/server/supabase.ts` | Service-role client for Route Handlers (admin/OTP/username checks) | **Present** |
| `RESEND_API_KEY` | 1 | `app/api/auth/otp/send/route.ts` | Send email OTP via Resend | **Present** |
| `OTP_FROM_EMAIL` | 1 | `app/api/auth/otp/send/route.ts` | From address for OTP email | **Present** |
| `RESEND_FROM_EMAIL` | 1 | `app/api/auth/otp/send/route.ts` | Alternate from-address name | **Absent** (optional alias) |
| `OTP_SIGNING_SECRET` | 1 | `lib/server/otp.ts` | Preferred secret for OTP HMAC | **Absent** |
| `VERCEL_PROJECT_PRODUCTION_URL` | 1 | `lib/server/otp.ts` | Fallback entropy for OTP signing when explicit secret missing | **Absent** (often provided on Vercel) |
| `NEXT_PUBLIC_SITE_URL` | 2 | `lib/authRedirect.ts` | Canonical site URL for redirects | **Absent** |
| `NEXT_PUBLIC_APP_URL` | 1 | `app/api/admin/reset/route.ts` | Alternate base URL for reset emails | **Absent** |
| `NEXT_PUBLIC_APP_VERSION` | 2 | `app/settings/page.tsx` | Display / JSON metadata version | **Absent** (defaults exist) |
| `ADMIN_ROOT_ALLOWLIST` | 1 | `app/api/admin/create-admin/route.ts` | Email allowlist for bootstrap admin creation | **Absent** |
| `EXPO_PUBLIC_SUPABASE_URL` | 1 | `mobile/supabase.ts` | Legacy **`mobile/`** sample client using Expo-style names | **Present** (duplicate of Next public URL intent) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 1 | `mobile/supabase.ts` | Same | **Present** |

**Highlighted — referenced but not in `ruehl-app/.env.local`:** `OTP_SIGNING_SECRET`, `RESEND_FROM_EMAIL`, `VERCEL_PROJECT_PRODUCTION_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_VERSION`, `ADMIN_ROOT_ALLOWLIST`.

**Highlighted — present in `.env.local` but only referenced from non-production-critical / odd paths:** `EXPO_PUBLIC_SUPABASE_*` pair — **only** `mobile/supabase.ts` (likely stale / mis-prefixed for a web repo).

---

### `ruehl-native` (Expo / Node — `process.env.*`)

Enumeration of **`/Users/mohammedaqra/ruehl-native/.env`** variable **names only** (values not inspected):  
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GIPHY_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**`.env.local`:** missing (not present as a file in this audit).

**`backend/.env` names only:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — **no** `SUPABASE_URL` / `SUPABASE_ANON_KEY` keys listed, while **`backend/index.js`** reads those names for trending/REST helper paths → **partial backend env** for local runs.

| Env var | Files that read it (count) | Example file | Purpose | Present in `ruehl-native/.env`? |
|---------|----------------------------|--------------|---------|--------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | 2+ | `supabase.ts` | Supabase client | **Present** |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 2+ | `supabase.ts` | Supabase anon key | **Present** |
| `EXPO_PUBLIC_API_URL` | 4+ | `services/spotifySearch.ts` | Base URL for HTTP API (Spotify proxy path, Chat) | **Present** |
| `EXPO_PUBLIC_GIPHY_API_KEY` | 1 | `components/GifPicker.tsx` | Giphy REST | **Present** |
| `NEXT_PUBLIC_SUPABASE_URL` | 2 | `lib/webSupabase.ts` | Secondary naming in native repo for web-preview paths | **Absent** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 2 | `lib/webSupabase.ts` | Same | **Absent** |
| `SPOTIFY_CLIENT_ID` | 2 | `backend/index.js`, `pages/api/spotify/search.js` | Spotify client-credentials | **Present** |
| `SPOTIFY_CLIENT_SECRET` | 2 | same | Same | **Present** |
| `SUPABASE_URL` | 1 | `backend/index.js` | Server-side Supabase REST from Express | **Absent** in `backend/.env` |
| `SUPABASE_ANON_KEY` | 1 | `backend/index.js` | Same | **Absent** in `backend/.env` |
| `PORT` | 1 | `backend/index.js` | Express listen port | **Absent** (defaults in code) |

---

## 3. Deployment Pipeline Map

### Git remotes (from `.git/config` files — no git CLI)

| Repository | Remote URL | Default branch ref |
|------------|------------|---------------------|
| **ruehl-app** | `https://github.com/aqrathefirst-creator/ruehl-app.git` | `main` tracks `origin/main` |
| **ruehl-native** | `https://github.com/aqrathefirst-creator/ruehl-native.git` | `main` tracks `origin/main` |

### Vercel vs `ruehl-app`

- **No `vercel.json`** and **no `.vercel/` project-linking directory** were found in **`ruehl-app`** — deployment settings live in the Vercel dashboard, not in-repo.
- **`WEB_DIRECTION.md` §7** and **`AUDIT_DRIFT.md` §6** state that **`project-rmo1v.vercel.app`** is the **authoritative** API host for web + native and that **`/api/spotify/*`** should live on that deployment. **This cannot be proven from the repo alone** (no project ID string in web source).
- **`ruehl-app`** implements many handlers under **`app/api/**`** (~41 `route.ts` files globbed); **`ruehl-app` does not contain `app/api/spotify/**`**.
- **Native** calls **`${EXPO_PUBLIC_API_URL}/api/spotify/search`** (e.g. `ChatScreen.tsx`, `services/spotifySearch.ts`). **`EXPO_PUBLIC_API_URL` is present** in **`ruehl-native/.env`** (name-only audit). Whether its value matches **`project-rmo1v.vercel.app`** or another deployment must be confirmed in dashboard/env — **not repeated here**.

### Parallel API stacks inside **`ruehl-native`**

- **`backend/index.js`**: Express server with **`/spotify/search`** (not under `/api`) and **`/music/trending`**.
- **`pages/api/spotify/search.js`**: Next Pages-style API inside the **native** repo (legacy / alternate dev stack).
- **`ruehl-app`**: App Router **`app/api/**`** only — **no Spotify route file** in tree.

### EAS (`eas.json`, `app.json`)

- **Profiles:** `development` (dev client, internal), `preview` (internal), `production` (auto-increment version), plus `submit.production`.
- **Bundle IDs:** iOS `com.ruehl.app`, Android `com.ruehl.app`.
- **EAS project ID:** `5feccaff-cdfe-45be-9c62-d8bc2c90b277` (`app.json` → `expo.extra.eas.projectId`).
- **Provisioning profile references:** not stored in audited JSON (Apple-side dashboard).

### Supabase migrations / how they apply

- **`ruehl-app`** has **`supabase/migrations/`** (24 SQL files per **`AUDIT_DRIFT.md`**); **no `supabase/config.toml`** in the web repo snapshot (native repo holds **`supabase/config.toml`** with **`project_id = "ymtzinhbzbsupbdmbjxg"`**).
- **`ruehl-native`** has **78** migrations with **zero filename overlap** with web (**`AUDIT_DRIFT.md` §3**).
- **`package.json`** in **`ruehl-app`** has **no** `supabase db push` / migration scripts — only `dev`, `build`, `start`, `lint`.
- **`.github/workflows/`** — **not present** in **`ruehl-app`** (no CI workflows in tree).

### Ambiguities

- **Which migration set matches production** is **unknown** from code alone — **manual Supabase dashboard / migration history** required (**🔴/🟡** strategic risk).
- **Edge functions** configured in **native** `supabase/config.toml` (`send-otp`, `verify-otp`, `verify_jwt = false`) imply **Supabase-hosted functions** separate from Next Route Handlers — deploy path is **Supabase CLI / dashboard**, not Next build.

---

## 4. Critical User Flows — Dependency Trace

### Flow A: Web user signs up

| Step | Status | Env / files |
|------|--------|-------------|
| Auth method | **Email/password + optional phone-style identifier** on `app/login/page.tsx`; verification flow uses **`/lib/authVerification`** + **`/verify-account`** | Supabase anon |
| Supabase Auth | ✅ **`supabase.auth.signUp` / sign-in** via `@/lib/supabase` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Email OTP (account verification) | ⚠️ **`/api/auth/otp/send`** requires Resend + from address | `RESEND_API_KEY`, `OTP_FROM_EMAIL` / `RESEND_FROM_EMAIL` |
| Username availability | ⚠️ **`GET /api/username/availability`** uses **service role** + **`profiles`** | `SUPABASE_SERVICE_ROLE_KEY` |
| Profile row | ❓ **Trigger vs client** — not fully traced here; **`profiles`** selected after auth in login flow | RLS / DB state dependent |
| Post-signup redirect | ✅ **`/verify-account`**, **`/onboarding/username`** per `app/layout.tsx` / login logic | — |

**Overall:** ⚠️ **partially configured** — core auth works if Supabase env present; email OTP path needs Resend + verified sender domain (dashboard).

---

### Flow B: Web user logs in

| Step | Status | Env / files |
|------|--------|-------------|
| Session | ✅ **`@supabase/supabase-js`** client in browser (`lib/supabase.ts`) | Public Supabase vars |
| SSR helpers | **`utils/supabase/server.ts`** exists for URL/anon (server contexts) | Same public vars |
| Persistence | ✅ Default Supabase-js **browser persistence** (not exhaustively verified vs `@supabase/ssr` cookie patterns — **`lib/supabase.ts` is primary client**) | — |
| 2FA | ⚠️ TOTP challenge path in **`app/login/page.tsx`** if `profiles.two_factor_enabled` | Supabase session |

**Overall:** ✅ **likely working** if anon keys correct; cookie-based SSR patterns are secondary in this codebase snapshot.

---

### Flow C: Web user sends a message (DM)

| Step | Status | Env / files |
|------|--------|-------------|
| **Web `/messages` inbox** | 🚫 **Not implemented as a route** in audited inventory; nav may link to future page | — |
| Realtime messaging schema | ❓ Native migration **`20260442_messaging_realtime.sql`** per **`WEB_DIRECTION.md` §4** / **`AUDIT_DRIFT.md`** — web parity not evidenced | Supabase realtime |
| GIF picker | 🚫 **Native-only** (`GifPicker.tsx` + **`EXPO_PUBLIC_GIPHY_API_KEY`**) | Giphy env on native only |
| Session room chat | ⚠️ **`/room/[id]`** uses **`session_room_messages`** table + realtime channel — **scoped chat**, not global DMs | Supabase |

**Overall:** 🚫 **missing** for product-level DMs on web; ⚠️ **partial** for session rooms only.

---

### Flow D: Web user plays / attaches a sound to a post

| Step | Status | Env / files |
|------|--------|-------------|
| Spotify Web API from **web** | 🚫 **No `SPOTIFY_*` env or `/api/spotify` route in `ruehl-app`** | — |
| Catalog / admin | ⚠️ **`app/api/admin/music/route.ts`** references **`spotify_id`** / licensed catalog fields | Service role for admin |
| **`licensed_tracks`** | ❓ Used via native + admin patterns; web **`explore`/create** may use **`sounds`** / posts — full trace omitted | DB |
| Open in Spotify | 🟢 **External URL patterns** exist on native (`SoundDetailScreen`, etc.); web sound surfaces vary by page | — |

**Overall:** ⚠️ **partially configured** on web for catalog/admin; **no** first-class Spotify search proxy in **`ruehl-app`** tree.

---

### Flow E: Web user uploads media to a post

| Step | Status | Env / files |
|------|--------|-------------|
| Storage bucket | ✅ **`media`** bucket, path `posts/{userId}-{timestamp}.{ext}` (`lib/supabase.ts` **`uploadPostMedia`**) | Anon upload policy must exist in Supabase |
| Size limits | Client-side caps in **`lib/supabase.ts`** (e.g. image/video MB limits) | — |
| CDN | 🟢 **Deferred** — public URL via **`getPublicUrl`** | — |

**Overall:** ✅ **likely working** if Storage policies align with **`AUDIT_DRIFT.md`** / migration reality.

---

### Flow F: Web user requests verification (Business / Media tier)

| Step | Status | Env / files |
|------|--------|-------------|
| API surface | ⚠️ **`/api/verification-requests`** uses table **`verification_requests`** (`app/api/verification-requests/route.ts`) | `SUPABASE_SERVICE_ROLE_KEY` |
| Native canonical model | **`verification_submissions`** + **`verification-documents`** bucket per **native migration `20260419000001_verification_system.sql`** (**drops `verification_requests`**) — **`AUDIT_DRIFT.md`**, **`WEB_DIRECTION.md` §7** | — |

**Overall:** 🔴 **Drift risk** — web code targets **`verification_requests`** while native migrations describe **`verification_submissions`** as replacement. Whether production still has the legacy table is **unknown** without DB inspection.

---

### Flow G: Admin reviews verification submissions

| Step | Status | Env / files |
|------|--------|-------------|
| Institutional admin gate | ✅ **`requireAdmin`** checks **`admin_users`** table (**`lib/admin/requireAdmin.ts`**) — **not** `profiles.is_admin` alone | Service role |
| Verification moderation API | ⚠️ **`app/api/admin/verification/route.ts`** reads **`verification_requests`** | Same drift as Flow F |
| **`users.is_admin`** vs **`profiles.is_admin`** | ⚠️ **`app/api/admin/users/route.ts`** exposes **`profiles.is_admin`**; **`WEB_DIRECTION.md` §7** says **`users.is_admin`** is authoritative post-native migration | Drift |

**Overall:** ⚠️ **partially configured** / **broken** depending on which tables exist in prod.

---

### Flow H: Native app hits deployed Next API (`EXPO_PUBLIC_API_URL`)

| Step | Status | Env / files |
|------|--------|-------------|
| Base URL env | ✅ **Name present** in **`ruehl-native/.env`** (`EXPO_PUBLIC_API_URL`) | Value not recorded here |
| **Spotify search** | **`services/spotifySearch.ts`** tries **`/api/spotify/search`** on API host; **`ruehl-app`** has **no** `app/api/spotify/*` | **🔴** if production deploy is only **`ruehl-app`** build artifact |
| **Express backend in native repo** | **`backend/index.js`** implements **`/spotify/search`** at **root path**, not **`/api/spotify/search`** — different shape than native client’s preferred path unless URL rewriting | **🟡** architectural mismatch |

**Overall:** ⚠️ **partially configured** — env exists; **route parity between repos is not demonstrated**.

---

## 5. Issues & Risks (prioritized)

1. **🔴 Supabase schema / migration drift (web 24 vs native 78; zero shared filenames)** — **`AUDIT_DRIFT.md` §3**; production may not match either folder alone. **Where:** both `supabase/migrations/` trees. **Direction:** single reconciliation plan before major web/native features.

2. **🔴 Verification pipeline mismatch (`verification_requests` web vs `verification_submissions` native)** — **`WEB_DIRECTION.md` §7**, **`AUDIT_DRIFT.md` §4–§6**. **Where:** `app/api/verification-requests/route.ts`, `app/api/admin/verification/route.ts`, settings UI. **Direction:** align to native schema + storage bucket when DB is ready.

3. **🔴 `/api/spotify/search` absent from `ruehl-app` but expected by native client + direction docs** — **`AUDIT_DRIFT.md` §6**, **`WEB_DIRECTION.md` §7**. **Where:** native `services/spotifySearch.ts`, `ChatScreen.tsx`; missing under **`ruehl-app/app/api/`**. **Direction:** implement proxy on deployed Next **or** repoint native to a documented backend; confirm Vercel project mapping.

4. **🔴 `is_admin` / admin model fragmentation** — **`users.is_admin`** (native migration) vs **`profiles.is_admin`** in some web admin APIs vs **`admin_users`** for `requireAdmin`. **Where:** `app/api/admin/users/route.ts`, `components/shell/AppShell.tsx` (reads **`users`**), **`lib/admin/requireAdmin.ts`**. **Direction:** single source of truth per **`WEB_DIRECTION.md` §7**.

5. **🟡 Resend / sender domain** — OTP route requires verified domain for **`OTP_FROM_EMAIL`**. **Where:** `app/api/auth/otp/send/route.ts`. **Direction:** Resend dashboard (manual).

6. **🟡 OTP signing secret weakness** — **`lib/server/otp.ts`** falls back to hashing **public** env material or literal **`ruehl-otp-fallback-secret`**. **Where:** same file. **Direction:** set **`OTP_SIGNING_SECRET`** in production; rotate if fallback was ever hit.

7. **🟡 `SUPABASE_SERVICE_ROLE_KEY` exposure** — **No** matches in **`'use client'`** files for this key in audited grep; usage confined to **`lib/server/*`** and **`app/api/**`**. **Direction:** keep pattern; verify Vercel “server-only” scoping in dashboard.

8. **🟡 `ruehl-app` legacy `supabase/migrations` “not operational source of truth”** — **`WEB_DIRECTION.md` §7**. **Direction:** treat as cleanup / reconciliation, not blind `db push`.

9. **🟢 `EXPO_PUBLIC_*` vars inside `ruehl-app/.env.local`** — duplicates Next naming; only **`mobile/supabase.ts`** consumes them. **Direction:** remove confusing duplicates when touching env hygiene.

10. **🟢 Native `backend/.env` incomplete vs `backend/index.js` expectations** — missing **`SUPABASE_URL`** / **`SUPABASE_ANON_KEY`** names in enumerated file; Spotify keys present. **Direction:** align env template for local Express runs.

11. **🟡 Drops schedule vs client (`NATIVE_SPEC.md` §3928)** — potential **DB constraint (10 min–7 days)** vs **client allowing wider schedule** — insert failures possible. **Direction:** align migration + client (`lib/drops.ts`) when touching Drops.

---

## 6. User Action Items (manual / dashboard only)

1. **[Resend]** Confirm the domain used by **`OTP_FROM_EMAIL`** is **verified** in Resend (SPF/DKIM as per Resend docs).
2. **[Vercel]** Confirm **`ruehl-app`** production project maps to **`project-rmo1v.vercel.app`** (or update **`WEB_DIRECTION.md`** / native **`EXPO_PUBLIC_API_URL`** to the real canonical host).
3. **[Vercel]** Ensure **`SUPABASE_SERVICE_ROLE_KEY`**, **`RESEND_*`**, **`OTP_FROM_EMAIL`**, and **`OTP_SIGNING_SECRET`** (recommended) are set for **server/runtime only**, not exposed to client bundles.
4. **[Spotify Developer Dashboard]** Confirm Spotify app credentials match **`ruehl-native/.env`** (`SPOTIFY_CLIENT_ID` / `SECRET`) and redirect URIs if OAuth flows expand.
5. **[Supabase]** Inspect **production** schema: does **`verification_requests`** still exist, or only **`verification_submissions`**? Align web APIs before relying on verification UX.
6. **[Supabase]** Confirm **applied migration history** for project **`ymtzinhbzbsupbdmbjxg`** vs folders in **`ruehl-app`** and **`ruehl-native`** (may require `supabase migration list` / dashboard history — manual).
7. **[Supabase Storage]** Validate **`media`** and **`verification-documents`** buckets, MIME/size limits, and public policies match **`AUDIT_DRIFT.md`** expectations.
8. **[EAS / Apple / Google]** When enabling push later, configure credentials in Expo/EAS dashboards (not evidenced in current env audit).

---

## 7. Recommended Next Steps (ordered)

| # | Step | Size | Blocking |
|---|------|------|----------|
| 1 | **Confirm production DB schema** vs **`verification_*`** tables and **`users.is_admin`** — drives all admin/verification work | **M** | Phases **2.4+**, launch readiness |
| 2 | **Resolve `/api/spotify/search` deployment** — add to **`ruehl-app`** **or** document alternate proxy + fix native base URL/proxy contract | **S–M** | Native music/chat flows depending on host |
| 3 | **Unify migration strategy** (single chronology / replay plan) — prerequisite for trustworthy RLS/schema | **L** | **Phase 2.2** `lib/` parity |
| 4 | **Set strong `OTP_SIGNING_SECRET` + site URLs** (`NEXT_PUBLIC_SITE_URL`) for auth flows | **S** | Security / UX |
| 5 | **Align admin authorization model** (`admin_users` vs **`users.is_admin`** vs **`profiles.is_admin`**) per **`WEB_DIRECTION.md` §7** | **M** | Admin + shell nav consistency |
| 6 | **Clean env hygiene** — drop duplicate **`EXPO_PUBLIC_*`** from web `.env.local` when safe | **S** | **Cleanup** |
| 7 | **Optional monitoring** — add Sentry/Datadog later (not present now) | **M** | Post-launch hardening |

---

*End of audit — **do not commit** this file unless intentionally adding it to version control.*
