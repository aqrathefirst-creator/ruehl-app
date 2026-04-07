import { redirect } from 'next/navigation';

export default function AdminAccessControlPage() {
  redirect('/admin?section=access_control');
}
