# Ruehl Web vs Native — Drift Audit

## Methodology

Read-only comparison of **`/Users/mohammedaqra/ruehl-app`** (Next.js web) vs **`/Users/mohammedaqra/ruehl-native`** (Expo React Native). Inspected `package.json`, top-level layout, `lib/`, `supabase/migrations/`, `app/` / screens, admin UI, API routes, and representative types/copy. **No repository code was modified.** Output is this file only (`AUDIT_DRIFT.md`).

---

## 1. Repo-level overview

### Tech stack (versions from `package.json`)

| Dimension | ruehl-app (web) | ruehl-native (mobile + tooling) |
|-----------|-----------------|--------------------------------|
| Framework | Next.js **16.2.1**, App Router (`app/`) | Expo **~54**, React Native **0.81**, **expo-router ~6**, plus root-level screen files |
| React | **19.2.4** | **19.1.0** |
| Supabase client | `@supabase/supabase-js` **^2.100**, `@supabase/ssr` **^0.9** | `@supabase/supabase-js` **^2.101** |
| State / data | Mostly local + Supabase (`lib/useUser.ts`) | `@tanstack/react-query` (+ persistence helpers) |
| Styling | Tailwind **v4**, Framer Motion, Leaflet | Nativewind-style Tailwind **^4**, RN primitives |
| Media | `@ffmpeg/ffmpeg` (web), camera flows in app | expo-av/camera/image-picker, **ffmpeg-kit-react-native-alt** |
| Extra | — | Flash List, Reanimated, Gesture Handler, RN SVG, etc. |

### Shared `lib/` — structural issue

**Two separate directories.** Not a symlink, npm workspace package, nor git subtree. Filename overlap is minimal; only a handful of **core/** files exist in both and even those are not always identical.

**Top-level folders (representative)**

| ruehl-app | ruehl-native |
|-----------|--------------|
| `app/` | `app/` (expo-router), **`screens/`**, root `*Screen.tsx` files |
| `components/` | `components/` |
| `lib/` | `lib/` |
| `mobile/` (legacy/sample) | — |
| `utils/` | `hooks/`, **`services/`**, **`navigation/`**, **`backend/`**, `assets/`, `tests/`, `types/` |
| `public/` | — |
| `supabase/` | `supabase/` |

### Intent docs

| File | Summary |
|------|---------|
| **ruehl-app `AGENTS.md`** | Points to Next.js breaking changes; read `node_modules/next/dist/docs/`. |
| **ruehl-app `CLAUDE.md`** | Single-line pointer to `@AGENTS.md`. |
| **ruehl-app `README.md`** | Default create-next-app boilerplate + Supabase redirect URLs for auth. |
| **ruehl-native `README.md`** | Expo starter + **recovery workflow** (`dev:state`, `dev:recover`). |
| **ruehl-native** | No `AGENTS.md` / `CLAUDE.md` at repo root. |

---

## 2. Shared library (`lib/`) drift

### Full file listing (relative paths)

**ruehl-app `lib/` (26 files)**

`adaptiveAlignment.ts`, `admin/executeRequest.ts`, `admin/generateEmployeeId.ts`, `admin/requireAdmin.ts`, `adminRoles.ts`, `alignmentEngine.ts`, `authRedirect.ts`, `authVerification.ts`, `cameraSession.ts`, `core/alignment.ts`, `core/distance.ts`, `core/matchEngine.ts`, `core/sessionsLogic.ts`, `createUploadQueue.ts`, `location/distance.ts`, `location/getNearbyPlaces.ts`, `previewAudio.ts`, `requireAdminPermission.ts`, `server/admin.ts`, `server/otp.ts`, `server/responses.ts`, `server/supabase.ts`, `sessions/computeSessionAlignment.ts`, `sessions/getAvailableSessions.ts`, `sessions/matchEngine.ts`, `supabase.ts`, `useUser.ts`

**ruehl-native `lib/` (27 files)**

`accountTypes.ts`, `alignment.ts`, `core/alignment.ts`, `core/distance.ts`, `core/matchEngine.ts`, `core/sessionsLogic.ts`, `core/soundRanking.ts`, `core/toneEngine.ts`, `creatorSurfacingFromPosts.ts`, `deviceTrust.ts`, `drops.ts`, `exploreHeaderUi.ts`, `isPowrPost.ts`, `navigation.ts`, `normalizePost.ts`, `parseBioMentions.tsx`, `postMedia.ts`, `postMusicIdentity.ts`, `postSoundResolver.ts`, `powr.ts`, `safeFetch.ts`, `sharePost.ts`, `soundTrendsFromPosts.ts`, `tabBarOverlayInset.ts`, `validatePostStorageUrl.ts`, `verification.ts`, `webSupabase.ts`

### Only on native (high signal)

`accountTypes.ts`, `verification.ts`, `drops.ts`, `deviceTrust.ts`, `powr.ts`, `normalizePost.ts`, `postMusicIdentity.ts`, `postSoundResolver.ts`, `postMedia.ts`, `safeFetch.ts`, `sharePost.ts`, `validatePostStorageUrl.ts`, `webSupabase.ts`, `creatorSurfacingFromPosts.ts`, `soundTrendsFromPosts.ts`, `exploreHeaderUi.ts`, `isPowrPost.ts`, `navigation.ts`, `parseBioMentions.tsx`, `tabBarOverlayInset.ts`, `alignment.ts` (root), `core/soundRanking.ts`, `core/toneEngine.ts`

### Only on web

Entire **`lib/server/*`**, **`lib/sessions/*`**, **`lib/admin/*`**, plus `supabase.ts`, `useUser.ts`, `alignmentEngine.ts`, `adaptiveAlignment.ts`, `authRedirect.ts`, `authVerification.ts`, `cameraSession.ts`, `createUploadQueue.ts`, `previewAudio.ts`, `requireAdminPermission.ts`, `adminRoles.ts`, `location/*`

### Present in both — content differs

| Path | What differs |
|------|----------------|
| `lib/core/distance.ts` | Web exports `getDistanceKm` as the primary name; native exports `calculateDistance` and aliases `getDistanceKm = calculateDistance`. |
| `lib/core/matchEngine.ts` | Same logic path; web imports `getDistanceKm` from `@/lib/core/distance`; native imports `calculateDistance` with a relative path. Functionally equivalent distance calc. |
| `lib/core/alignment.ts`, `lib/core/sessionsLogic.ts` | **Identical** in this workspace snapshot (`diff` empty). |

---

## 3. Database schema drift (Supabase)

### Critical structural fact

**Zero shared migration filenames** between repos (`comm` intersection count **0**). Web has **24** SQL migrations; native has **78**. Histories diverged completely—merging requires reconciliation, not a simple linear apply.

### Web migrations (sorted)

1. `20260329_settings_privacy_activity.sql`
2. `20260330090000_auth_profile_social_upgrades.sql`
3. `20260330100000_custom_email_otp_verification.sql`
4. `20260330110000_posts_content_engine_fields.sql`
5. `20260330120000_profiles_insert_policy.sql`
6. `20260331110000_content_moderation_audit.sql`
7. `20260331120000_powr_lifts.sql`
8. `20260403090000_sounds_cover_identity.sql`
9. `20260403100000_sounds_preview_url.sql`
10. `20260404090000_ruehl_scoring_engine.sql`
11. `20260404100000_alignment_engine_fields.sql`
12. `20260404113000_scoring_engine_stability_controls.sql`
13. `20260404153000_admin_institutional_controls.sql`
14. `20260404170000_admin_identity_system.sql`
15. `20260404193000_admin_users_rls_policies.sql`
16. `20260404201000_internal_request_governance.sql`
17. `20260404220000_enforce_profiles_username.sql`
18. `20260404233000_sessions_matching_system.sql`
19. `20260404234000_admin_control_panel.sql`
20. `20260404235000_admin_platform_control_system.sql`
21. `20260405000000_stories_feature.sql`
22. `20260405010000_places_intelligence.sql`
23. `20260405011000_sessions_live_flow.sql`
24. `20260405012000_creator_led_sessions.sql`

### Native migrations (sorted — full list, 78 files)

Basenames only (sorted lexically by filename = chronological intent). **Every** native file below is **`native-only` by filename** versus `ruehl-app/supabase/migrations/` (zero intersection).

1. `20260331_add_avatar_url_to_users_profiles.sql`
2. `20260331_add_posts_thumbnail_and_indexes.sql`
3. `20260331_add_resolve_feed_identity_function.sql`
4. `20260331_add_resolve_login_email_function.sql`
5. `20260331_extend_resolve_login_email_with_auth_users.sql`
6. `20260331_sync_usernames_between_users_profiles.sql`
7. `20260401_add_post_visibility_and_reports.sql`
8. `20260401_add_verified_badge.sql`
9. `20260401_create_users_table.sql`
10. `20260401_fix_resolve_feed_identity_picture_field.sql`
11. `20260401_increase_media_bucket_upload_limit.sql`
12. `20260401_relax_media_bucket_mime_types.sql`
13. `20260401_storage_rls_policies.sql`
14. `20260402_add_comment_likes.sql`
15. `20260402_add_post_lifts.sql`
16. `20260402_ensure_media_bucket_public.sql`
17. `20260402_fix_stories_rls_insert_policy.sql`
18. `20260402_storage_rls_update_policy.sql`
19. `20260403_add_retention_streaks_and_signals.sql`
20. `20260403_add_ruehl_charts_ranking_engine.sql`
21. `20260403_add_training_safety_system.sql`
22. `20260403_add_user_alignments.sql`
23. `20260403_create_training_tables.sql`
24. `20260403_users_public_select_policy.sql`
25. `20260404_posts_stories_music_backend.sql`
26. `20260405_add_fetch_explore_feed_bundle_function.sql`
27. `20260405_restore_verified_to_resolve_feed_identity.sql`
28. `20260406_add_fetch_explore_feed_bundle_function.sql`
29. `20260407_auth_age_and_username_availability.sql`
30. `20260408_add_home_search_topics.sql`
31. `20260409_add_music_usage_and_trending.sql`
32. `20260410_fix_licensed_tracks_write_access.sql`
33. `20260411_raise_media_bucket_upload_limit.sql`
34. `20260411_raise_media_bucket_upload_limit_to_5gb.sql`
35. `20260412_add_profile_lyric_text.sql`
36. `20260413_add_identity_system_fields.sql`
37. `20260414_fix_profile_posts_visibility.sql`
38. `20260415_add_powr_posts_and_lifts.sql`
39. `20260416450000_create_otp_codes.sql`
40. `20260416460000_security_settings_rls.sql`
41. `20260416470000_add_media_urls_to_posts.sql`
42. `20260416_posts_write_rls_policies.sql`
43. `20260417000001_missing_tables.sql`
44. `20260417000002_performance_indexes.sql`
45. `20260417000003_scroll_back_rpc.sql`
46. `20260417_add_posts_category_column.sql`
47. `20260418000001_trusted_devices.sql`
48. `20260418000002_revoke_trusted_devices_return_int.sql`
49. `20260418000003_add_account_types.sql`
50. `20260418000004_add_website_to_profiles_users.sql`
51. `20260418_posts_music_preview_url.sql`
52. `20260419000001_verification_system.sql`
53. `20260419000002_drops_system.sql`
54. `20260419_resolve_feed_identity_users_username.sql`
55. `20260420_identity_resolution_for_notifications.sql`
56. `20260421_post_lifts_readable_view.sql`
57. `20260422_resolve_feed_identity_identity_text.sql`
58. `20260423_posts_media_type.sql`
59. `20260424_posts_media_type_backfill_storage_paths.sql`
60. `20260425_posts_media_type_storage_variants.sql`
61. `20260426_posts_media_type_posts_bucket.sql`
62. `20260427_posts_rls_authenticated_insert_select.sql`
63. `20260428_add_unique_user_post_lift_constraint.sql`
64. `20260429_create_events_table.sql`
65. `20260430_events_music_behavior_types.sql`
66. `20260431_licensed_tracks_preview_url_nullable.sql`
67. `20260432_events_music_event_types_idempotent.sql`
68. `20260433_posts_powr_voice.sql`
69. `20260434_ruehl_sounds_voice_posts.sql`
70. `20260435_posts_voice_caption.sql`
71. `20260436_posts_backfill_music_preview_url.sql`
72. `20260437_posts_listen_count_increment.sql`
73. `20260438_echoes_table.sql`
74. `20260439_echoes_user_profiles_fk.sql`
75. `20260440_posts_lift_count.sql`
76. `20260441_powr_milestone_notifications.sql`
77. `20260442_messaging_realtime.sql`
78. `20260443_messages_delete_own.sql`

### Native-only migrations — digest (read each SQL for exact DDL; filenames are indicative)

| File | One-line gist |
|------|----------------|
| `20260331_*` (6 files) | Login/resolve helpers, thumbnails, avatar sync between `users`/`profiles`. |
| `20260401_*` (7 files) | Foundational `users`, visibility, verified badge, storage mime/size + RLS. |
| `20260402_*` (6 files) | Comment likes, **`post_lifts`**, stories RLS fixes, storage policy updates. |
| `20260403_*` (6 files) | Charts engine, retention, alignments, training tables, user SELECT policy. |
| `20260404_posts_stories_music_backend.sql` | Posts/stories/music plumbing + cron hooks. |
| `20260405_*` / `20260406_*` | Explore feed bundle RPC (+ duplicate dated variant). |
| `20260407_*` … `20260411_*` | Age gate, explore topics, music usage/trending, licensed track fixes, bucket limits. |
| `20260412_*` … `20260415_*` | Profile lyric text, **`identity_system_fields`**, visibility fixes, POWR+lifts integration. |
| `202604164*` … `20260416_posts_*` | OTP/security settings/media URLs/posts write policies. |
| `20260417000001_missing_tables.sql` | Backfills missing catalog tables (includes **`verification_requests`** legacy — later dropped). |
| `20260417000002_performance_indexes.sql` | Indexes. |
| **`20260417000003_scroll_back_rpc.sql`** | **`scroll_back_count`, `scroll_backs`, RPC**. |
| `20260417_add_posts_category_column.sql` | Post taxonomy column. |
| **`20260418000001_*`**, **`…0002_*`** | **`trusted_devices`** + revoke RPC return type fix. |
| **`20260418000003_add_account_types.sql`** | Account type model + contacts + badges (see §3 highlights). |
| **`20260418000004_add_website_to_profiles_users.sql`** | **`website`** column. |
| `20260418_posts_music_preview_url.sql` | Preview URLs on posts. |
| **`20260419000001_verification_system.sql`** | Drops **`verification_requests`**, adds **`verification_submissions`**, **`users.is_admin`**, storage. |
| **`20260419000002_drops_system.sql`** | **`drops`**, **`drop_tune_ins`**, **`drop_echoes`**, schedule/window rules. |
| `20260419_resolve_feed_identity_users_username.sql` | RPC/view tweak for identity resolution. |
| `20260420_identity_resolution_for_notifications.sql` | Identity for notifications (`profiles` policies / resolve function updates). |
| `20260421_post_lifts_readable_view.sql` | Readable view for lifts. |
| `20260422_resolve_feed_identity_identity_text.sql` | Adds **`identity_text`** into resolve feed payload. |
| `20260423_*` … `20260428_*` | **`posts.media_type`** rollout + storage variants + bucket + RLS + unique lift constraint. |
| `20260429_*` … `20260432_*` | **`events`** tables + music behavior/event typing + licensed_track nullability. |
| `20260433_*` … `20260437_*` | POWR voice (`posts_powr_voice`, ruehl sounds, caption, listen count increment, backfills). |
| **`20260438_echoes_table.sql`** / **`20260439_*`** | **`echoes`** + FK to profiles. |
| `20260440_posts_lift_count.sql` | Lift count denorm on posts. |
| `20260441_*` | POWR milestone notifications. |
| **`20260442_*`**, **`20260443_*`** | Messaging realtime enablement + delete-own policy. |

### Native-only highlights (requested areas)

| Migration | Summary |
|-----------|---------|
| **`20260418000003_add_account_types.sql`** | Adds `account_type`, `account_category`, `badge_verification_status`, `contact_email`, `contact_phone`, `display_category_label`, `display_contact_info`, `category_picked_at` on **`users` + `profiles`**; CHECKs for tier/category combos; indexes on profiles for discovery. |
| **`20260418000004_add_website_to_profiles_users.sql`** | Adds **`website`** to `profiles` and `users`. |
| **`20260419000001_verification_system.sql`** | **Drops `verification_requests`**. Adds **`users.is_admin`**, creates **`verification_submissions`** (document path, legal name, snapshot of account type/category, review fields), **RLS** for self + admin, **trigger** syncing submission status → `profiles`/`users`.`badge_verification_status`, **`verification-documents`** storage bucket + policies. |
| **`20260419000002_drops_system.sql`** | **`drops`** (scheduled voice strip + state machine), **`drop_tune_ins`**, **`drop_echoes`** (+ storage), **follows** uniqueness cleanup, **`one active drop per creator`** trigger; **schedule constraint**: `scheduled_for` between **`created_at + 10 minutes`** and **`created_at + 7 days`**; **duration by account type** (e.g. personal 60–90s, business 10–45s, media 10–90s); live window treated as **`scheduled_for + 30 minutes`** in policies (commented “derived at query time”). |
| **`20260417000003_scroll_back_rpc.sql`** | `posts.scroll_back_count`, **`scroll_backs`** table, **`increment_scroll_back_count`** RPC. |
| **`20260438_echoes_table.sql`** | `posts.echo_count`, **`echoes`** table (voice replies), trigger to bump count. |
| **`20260418000001_trusted_devices.sql`** | **`trusted_devices`** + RLS + **`revoke_all_trusted_devices()`**. |

**Schedule / window note:** In `drops_system`, the **lead-time window** is explicitly **10 minutes–7 days** relative to `created_at`. The **live Echo window** is **30 minutes** after `scheduled_for` (used in RLS checks). Any “relaxation” vs an older product rule is not evidenced as a separate migration in-repo—this file encodes the current constraint set.

### Web-only migrations (not in native filenames)

The 24 files listed above under web exist **only** in `ruehl-app`’s migration folder—native does not duplicate them by name. They emphasize **sessions/places**, **admin platform control**, **stories**, **scoring/alignment**, **Powr lifts** naming, etc. **Reconciling prod** likely means: one canonical migration history + replay or diff-based merge.

---

## 4. Feature-level drift

Status legend: **P** = Present & matching · **S** = Present but stale · **M** = Missing entirely · **N** = Not applicable to web  

Paths are **ruehl-app** unless noted.

| Feature | Status | Evidence |
|---------|--------|----------|
| **Account types** (Personal/Business/Media, sub-categories, privacy locks, category label display) | **M** | No `account_type` / `account_category` usage in web codebase (grep); no `lib/accountTypes.ts`. Native: `AccountTypeScreen.tsx`, `lib/accountTypes.ts`. |
| **Verification** (submission flow, states, admin review, badge) | **S** | Web: `/api/verification-requests`, `/api/admin/verification` use **`verification_requests`** (`SettingsPage.tsx`, admin route). Native migration **drops** that table for **`verification_submissions`**. Web `components/VerificationBadge.tsx` is a **static SVG**, not tied to `badge_verification_status`. |
| **Profile display** (contact email/phone, website, toggles, category chips) | **M** / **S** | `app/edit-profile/page.tsx` only **username, bio, avatar_url**. `ProfileClient.tsx` types omit contact/account fields. Native `ProfileScreen.tsx` selects full field set. |
| **Identity page / Tagline rename** | **M** | Web: **no** `identity_text` / tagline strings in TS/TSX (grep). Native: `IdentityScreen.tsx`, `EditTaglineScreen`, `App.tsx` wiring. |
| **DROPS** (composer, tune-in, listening, echoes, wrap-up, NOW ranking) | **M** | No `drops` / `drop_tune_ins` references in web. Native: `lib/drops.ts`, `screens/DropComposerScreen.tsx`, etc. |
| **POWR posts + voice strips** | **S** | Web: `app/create/page.tsx` POWR mode, `app/powr/page.tsx`, lifts on `app/now/page.tsx`. Native has deeper POWR/voice pipeline (`CreateScreen.tsx`, `lib/powr.ts`, `lib/isPowrPost.ts`). Parity unclear without runtime DB. |
| **Lifts** | **P** / **S** | Web `app/now/page.tsx` uses **`post_lifts`**. Aligns with native concept; scoring/UI may differ. |
| **Echoes** (voice replies on posts) | **M** | Web only **`echoCancellation`** mic flag in create (`app/create/page.tsx`). No **`echoes`** table usage. Native migration + UI. |
| **Scroll backs** | **M** | No references. Native Home/Explore use scroll-back analytics. |
| **Music / soundtrack on profiles** | **S** | Web has sounds charts, `saved-sounds`, alignment/sound fields on home feed types (`app/page.tsx`). Native `postMusicIdentity.ts`, soundtrack on Identity/tagline flows—richer. |
| **Auto-login / trusted devices** | **N** / **M** | Browser sessions differ; native **`trusted_devices`** / `TrustedDevicesScreen.tsx` / `lib/deviceTrust.ts`—no web counterpart. |
| **Location search** | **S** | Web `lib/location/getNearbyPlaces.ts`, sessions/maps features. Native Explore/chat may differ in APIs. |
| **Trending Now** | **P** / **S** | Web `app/charts/page.tsx` **“Trending Now”** section; admin music **`is_trending`**. Native Explore builds trending from posts + licensed tracks (`ExploreScreen.tsx`). Different algorithms. |
| **Other native-only surfaces** | — | Examples: **`TrustedDevicesScreen`**, **`DropComposerScreen`**, **`VerificationScreen`** (native schema), **`AnalyticsScreen`**, **`SoundChartScreen`**, **`SoundPageScreen`**, **`ChatScreen`** (Spotify search wiring), **`MessagesScreen`** / realtime messaging migrations. |

---

## 5. Admin dashboard drift (`/admin`)

Main shell: **`app/admin/page.tsx`** + **`components/admin/AdminLayout.tsx`**. Sections defined in `SECTIONS` include: Dashboard, Charts Analytics, Users, Content, Moderation, Reports, Music, **Fitness / Genres**, Feed Control, Support, System, Access Control, Requests, Sounds Intelligence, Posts Intelligence, Scoring Debug, Activity Monitor. Separate folder routes exist for some (`app/admin/users`, `content`, `moderation`, `feed-control`, `requests`, `access-control`, `login`)—several redirect into the single-page section UI.

### Per-area notes

| Section | What it does (from code intent) | Matches native data model? |
|---------|--------------------------------|---------------------------|
| **Dashboard** | KPIs via `/api/admin/dashboard` | Generic counts—**no account-type / verification queue fields** surfaced in API handlers reviewed. |
| **Users** | `/api/admin/users` merges **Auth users** + **`profiles`** selected fields: `username`, `avatar_url`, `is_verified`, `is_admin`, shadow ban fields—**no `account_type` / `badge_verification_status`**. | **Partial** — if prod uses **`users.is_admin`** (native verification migration) vs **`profiles.is_admin`**, behavior can diverge. |
| **Content** | `/api/admin/content` — posts moderation flags | No drops/echoes/verification submissions. |
| **Moderation** | Label ties to “Verification and moderation queue”; implementation still **`verification_requests`** in `/api/admin/verification` | **Stale** vs native **`verification_submissions`**. |
| **Reports** | `/api/admin/reports` | Standard reporting—no drop-specific moderation. |
| **Music** | `/api/admin/music` — licensed tracks, **`is_trending`** | Aligns with catalog concepts in native **`services/music.ts`** directionally; schema may differ by migration chain. |
| **Fitness / Genres** | **`admin_genres`** via `/api/admin/genres` — taxonomy weights / request workflow | **Naming drift**: “Fitness” looks like legacy label; implementation is **genre taxonomy**, not workout/fitness domain. Verify product intent vs native explore/genre usage. |
| **Feed Control** | `app/admin/feed-control/page.tsx` — governance | Web-specific feed governance. |
| **Support** | `/api/admin/support` | Tickets—no native parity requirement unless shared. |
| **System** | Health / policy modes | Web institutional controls from web migrations. |

### Missing admin capabilities vs native needs

- **Verification review queue** tied to **`verification_submissions`** + document bucket + **`users.is_admin`**.
- **DROPS moderation** (live/scheduled content, **`drop_echoes`** abuse).
- **Account-type-aware** filters and badges on user directory.
- **Echoes / scroll-back** analytics abuse signals (if product wants parity).

---

## 6. API / backend drift

### Same Vercel backend?

- **Native** `.env` sets **`EXPO_PUBLIC_API_URL=https://project-rmo1v.vercel.app`** (grep on `ruehl-native/.env`).
- **Web** uses **relative** `fetch('/api/...')` and Next **Route Handlers** under **`app/api/**`**—no hard-coded `project-rmo1v` string in `ruehl-app` source.

If **`project-rmo1v.vercel.app`** deploys **this** Next app, native and web share origin for API routes. **Cannot confirm deployment mapping from repo alone.**

### Express `backend/` (native repo only)

`ruehl-native/backend/index.js` exposes **`GET /health`**, **`GET /music/trending`**, **`GET /spotify/search`** (Spotify proxy + trending from Supabase REST). **Not part of `ruehl-app` tree.**

### Web Route Handlers (inventory)

Under **`app/api/`** (sample): `account`, `activity/*`, `admin/*` (dashboard, users, content, verification, genres, music, reports, …), `auth/otp/*`, `blocks`, `follows`, `reports`, `sessions/*`, `settings`, `stories/*`, `username/availability`, `verification-requests`, etc. (**41** `route.ts` files globbed).

### Endpoint gaps / drift

| Topic | Detail |
|-------|--------|
| **Spotify search** | Native **`ChatScreen.tsx`** / **`services/spotifySearch.ts`** call **`${API}/api/spotify/search`** (and fallbacks). **`ruehl-app` has no `app/api/spotify/*` route** in repo—either deployed elsewhere, proxied on Vercel outside this tree, or **broken** if only this codebase ships. |
| **Trending music** | Native backend **`/music/trending`** vs web admin/music + charts paths—different surfaces. |
| **Verification** | Web **`verification-requests`** ↔ native schema **`verification_submissions`** after migration **`20260419000001_verification_system.sql`** — **breaking drift** if DB migrated to native-only. |

---

## 7. Shared types / TypeScript drift

| Type area | Web | Native (representative) |
|-----------|-----|-------------------------|
| **Profile / user** | `lib/useUser.ts`: **`UserProfile`** `{ id, username, avatar_url?, verified? }`. **`ProfileClient`**: `{ id, username, bio, avatar_url }`. **`ExplorePage` Profile**: adds shadow/suspension flags only. | **`ProfileScreen`** selects **`account_type`, `account_category`, contact fields, `website`, display toggles**, etc. |
| **Posts** | Rich home feed types in **`app/page.tsx`** (`alignment_score`, sound metadata, …). | **`normalizePost.ts`**, **`CreateScreen`** payloads with media categories, POWR/voice paths. |
| **Verification** | **`VerificationRequest`** shaped around **`full_name`, `reason`, `social_links`** (`SettingsPage.tsx`). | **`verification.ts`** + DB **`verification_submissions`** shape (documents, legal entity, …). |

**Fields present in native UX / migrations but absent from web TS models**: `account_type`, `account_category`, `badge_verification_status`, `contact_email`, `contact_phone`, `website` (as first-class profile settings), `display_category_label`, `display_contact_info`, `category_picked_at`, verification submission document fields—plus **`is_admin`** location (**`users`** in native migration vs **`profiles`** in several web admin queries).

---

## 8. Branding / copy / design drift

| Topic | Observation |
|-------|-------------|
| **Taglines / “Ruehl is where real ones live”** | Not found in **`ruehl-app`** TS/TSX grep sample; native marketing strings appear in share/copy (`CreateScreen`, etc.)—**not string-for-string audited across all native files.** |
| **Verification / settings copy** | Web settings center **`verification_requests`** flow; native **Verification** settings subtitle **“Get verified on Ruehl”** (`SettingsScreen.tsx`). |
| **Nav / density** | Web: **`BottomNav`**, **`DesktopSidebar`** — desktop-first patterns. Native: tab + modal stacks (`App.tsx`). Expect **visual divergence** by platform. |
| **Badges** | Web **`VerificationBadge`** is generic gray check SVG; native ties verification + account-type UX more deeply. |

---

## 9. Priority-ranked migration list (recommended order)

Rough size: **S** small · **M** medium · **L** large.

| Rank | Item | Size |
|------|------|------|
| 1 | **Unify Supabase migration history** with native (single source of truth; resolve 0 filename overlap). | **L** |
| 2 | **Align verification**: replace `verification_requests` usage with **`verification_submissions`**, storage bucket, admin queue, **`users.is_admin`** semantics. | **L** |
| 3 | **Account types system** on web (`lib/accountTypes.ts` parity, settings, privacy locks, profile chips). | **L** |
| 4 | **Profile/contact model**: website, contacts, display toggles—edit UI + **`ProfileClient`**. | **M** |
| 5 | **Identity / tagline**: `identity_text` (and related fields per DB) — rename/copy parity with native. | **M** |
| 6 | **Admin Users API/UI**: filter/display **`account_type`, `badge_verification_status`**; fix **`is_admin`** source table. | **M** |
| 7 | **Breakage fix**: Spotify **`/api/spotify/search`** (or proxy) if native relies on **`project-rmo1v`** + Chat explore. | **S–M** |
| 8 | **DROPS** full vertical (composer, tune-in, echoes shelf, NOW)—likely **native-only for launch** but DB already native. | **L** |
| 9 | **Echoes** (voice replies) + **`echo_count`** UI if parity required. | **M** |
|10 | **Scroll backs** analytics + RPC if feeds should match ranking. | **M** |
|11 | **Trusted devices** — likely **N/A for web**, but document auth security parity. | **S** |
|12 | **shared `lib/`**: port **`drops.ts`, `verification.ts`, `accountTypes.ts`, `normalizePost.ts`** into web or shared package to stop divergence. | **M** |
|13 | **Trending / Explore**: align algorithms (`soundTrendsFromPosts` vs web charts/explore). | **M** |
|14 | **POWR/voice**: reconcile create flows with **`isPowrPost`**, voice strip storage rules. | **M** |
|15 | **Admin**: DROPS moderation + verification document review + account-type filters. | **M** |

---

*End of audit — review with Phase 2 planning.*
