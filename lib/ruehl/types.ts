/**
 * Consolidated domain types for web — aligned to native migrations + Profile selections.
 *
 * Supabase generated types in `ruehl-app` may lag; do not “fix” client typings here (Phase 2.2.5 / 2.4).
 */

import type { AccountCategory, AccountType, BadgeVerificationStatus } from './accountTypes';
import type { NormalizedEngagement } from './posts';
import type { PostMediaType, PostSoundInput } from './posts';
import type { VerificationStatus } from './verification';

export type { PostMediaType, PostSoundInput } from './posts';

/** `public.users` + mirrored profile fields — `ProfileScreen` / native migrations (`20260418000003_*`, `20260419000001_*`). */
export type RuehlProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  identity_text: string | null;
  account_type: AccountType | null;
  account_category: AccountCategory | null;
  badge_verification_status: BadgeVerificationStatus;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  display_category_label: boolean | null;
  display_contact_info: boolean | null;
  category_picked_at: string | null;
  is_verified: boolean | null;
  created_at: string | null;
};

/**
 * `public.users` row subset — **`is_admin` lives here post-`20260419000001_verification_system.sql`**
 * (WEB_DIRECTION.md §7).
 */
export type RuehlUser = {
  id: string;
  is_admin: boolean;
  /** Mirrored columns may also exist — extend in Phase 2.3 when web queries align. */
};

/**
 * Feed/post row — combine `posts` columns with {@link NormalizedEngagement} after `normalizePost()`.
 * Soundtrack columns follow {@link PostSoundInput} / `resolvePostSound`.
 *
 * See also `20260423_posts_media_type.sql`, `20260438_echoes_table.sql`, `20260417000003_scroll_back_rpc.sql`,
 * `20260402_add_post_lifts.sql`.
 */
export type RuehlPost = {
  id: string;
  user_id: string;
  content: string | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  media_type?: PostMediaType | null;
  created_at?: string | null;
  echo_count?: number | null;
  lifts_count?: number | null;
  listen_count?: number | null;
  scroll_back_count?: number | null;
} & PostSoundInput &
  Partial<NormalizedEngagement>;

/** `public.echoes` — `20260438_echoes_table.sql`. */
export type RuehlEcho = {
  id: string;
  post_id: string;
  user_id: string;
  audio_url: string;
  created_at: string;
};

/** `public.scroll_backs` — `20260417000003_scroll_back_rpc.sql`. */
export type RuehlScrollBack = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

/** `public.post_lifts` — `20260402_add_post_lifts.sql`. */
export type RuehlLift = {
  id: number;
  post_id: string;
  user_id: string;
  created_at: string;
};

/**
 * `public.verification_submissions` — **`20260419000001_verification_system.sql`** (snake_case / DB shape).
 * Prefer mapping to camelCase {@link VerificationSubmission} from `./verification` in UI layers.
 */
export type VerificationSubmissionDbRow = {
  id: string;
  user_id: string;
  account_type: string;
  account_category: string;
  legal_entity_name: string;
  website_url: string | null;
  user_notes: string | null;
  document_path: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type { Drop, DropEcho, DropTuneIn } from './drops';
