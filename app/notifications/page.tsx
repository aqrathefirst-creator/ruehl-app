import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getNotifications } from '@/lib/ruehl/queries/notifications';
import NotificationsInbox from '@/components/notifications/NotificationsInbox';

export default async function NotificationsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/login');
  }

  const initial = await getNotifications(user.id, 0, 30, supabase);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <NotificationsInbox initial={initial} />
      </div>
    </div>
  );
}
