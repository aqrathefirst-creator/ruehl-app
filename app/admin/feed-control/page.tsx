import { redirect } from 'next/navigation';

export default function AdminFeedControlPage() {
  redirect('/admin?section=feed');
}
