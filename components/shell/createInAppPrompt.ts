'use client';

import { toast } from 'sonner';

const APP_STORE_URL = 'https://apps.apple.com/app/ruehl';

/** Path D: web has no creation — prompt users to use the iOS app (matches native Create FAB affordance). */
export function showCreateInAppPrompt() {
  toast('Create in the Ruehl app', {
    description: 'Posting and dropping happens in the iOS app.',
    action: {
      label: 'Get the app',
      onClick: () => window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer'),
    },
  });
}
