import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';

export type SettingsRecord = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  account_type: AccountType;
  account_subtype: AccountCategory;
  allow_messages_from: 'everyone' | 'followers' | 'none';
  show_activity_status: boolean;
  allow_tagging: boolean;
  two_factor_enabled: boolean;
  is_verified: boolean;
};

export type ActivitySummary = {
  liked_posts: Array<{ id: string; post_id: string; created_at: string }>;
  saved_posts: Array<{ id: string; post_id: string; created_at: string }>;
  comments: Array<{ id: string; post_id: string; content: string; created_at: string }>;
  lifted_posts: Array<{ id: string; post_id: string; created_at: string }>;
  matches: Array<{ id: string; status: string; created_at: string }>;
};

export type BlockedUserItem = {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked?: { id: string; username: string; avatar_url: string | null } | null;
};
