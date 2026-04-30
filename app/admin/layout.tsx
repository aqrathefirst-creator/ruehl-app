import { requireAdminFromCookies } from '@/lib/admin/requireAdmin';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') || '';

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return <>{children}</>;
  }

  const result = await requireAdminFromCookies();
  if (!result.ok) {
    redirect('/');
  }

  return <>{children}</>;
}
