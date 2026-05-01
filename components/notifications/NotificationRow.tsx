'use client';

import Link from 'next/link';
import VerificationBadge from '@/components/profile/VerificationBadge';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { NotificationItem } from '@/lib/ruehl/queries/notifications';

type Props = {
  notification: NotificationItem;
  onActivate: () => void;
};

function actionText(kind: string): string {
  const k = kind.toLowerCase();
  switch (k) {
    case 'lift':
      return 'lifted your post';
    case 'follow':
      return 'started following you';
    case 'comment':
      return 'commented on your post';
    case 'mention':
      return 'mentioned you';
    case 'message':
      return 'sent you a message';
    default:
      return kind.replace(/_/g, ' ') || 'sent an update';
  }
}

function notificationHref(n: NotificationItem): string {
  if (n.target_type === 'post' && n.target_id) return `/post/${n.target_id}`;
  if (n.target_type === 'drop' && n.target_id) return `/drop/${n.target_id}`;
  if (n.target_type === 'profile' && n.target_id) return `/profile/${n.target_id}`;
  if (n.target_type === 'message') return '#';
  if (n.actor?.username) return `/${String(n.actor.username).replace(/^@+/, '')}`;
  return '#';
}

export default function NotificationRow({ notification, onActivate }: Props) {
  const href = notificationHref(notification);
  const action = actionText(notification.kind);
  const handle = String(notification.actor?.username || 'someone').replace(/^@+/, '');
  const initial = handle.slice(0, 1).toUpperCase() || '?';
  const isPlaceholderLink = href === '#';

  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
        {notification.actor?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={notification.actor.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="inline-flex items-center gap-1 font-bold">
            @{handle}
            <VerificationBadge
              status={notification.actor?.badge_verification_status ?? null}
              legacyIsVerified={notification.actor?.is_verified}
              size="sm"
            />
          </span>{' '}
          <span className="text-zinc-300">{action}</span>
        </div>

        {notification.target_preview ? (
          <p className="mt-1 line-clamp-1 text-sm text-zinc-500">{notification.target_preview}</p>
        ) : null}

        <p className="mt-1 text-xs text-zinc-600">{formatRelativeShort(notification.created_at)}</p>
      </div>

      {!notification.read ? (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#a855f7]" aria-hidden />
      ) : null}
    </>
  );

  const className = `flex items-start gap-3 rounded-lg p-3 transition ${
    notification.read ? 'hover:bg-zinc-900/40' : 'bg-violet-500/5 hover:bg-violet-500/10'
  }`;

  if (isPlaceholderLink) {
    return (
      <button type="button" onClick={onActivate} className={`w-full text-left ${className}`}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className} onClick={onActivate}>
      {inner}
    </Link>
  );
}
