'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/** Path D: posting is app-only; shared links to /create redirect home with guidance. */
export default function CreateRedirect() {
  const router = useRouter();

  useEffect(() => {
    toast('Posting is in the Ruehl app. Get it from the App Store.');
    router.replace('/');
  }, [router]);

  return null;
}
