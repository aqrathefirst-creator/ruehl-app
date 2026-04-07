import { redirect } from 'next/navigation';

export default function AdminRequestsPage() {
  redirect('/admin?section=requests');
}
