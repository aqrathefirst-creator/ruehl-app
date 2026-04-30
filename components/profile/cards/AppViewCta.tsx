import { RUEHL_APP_CTA_URL } from '@/lib/ruehl/appLinks';

export default function AppViewCta() {
  return (
    <div className="mt-2 border-t border-zinc-800/80 pt-2 text-center">
      <a
        href={RUEHL_APP_CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] font-medium text-violet-400/90 underline-offset-2 hover:text-violet-300 hover:underline"
      >
        View in Ruehl app
      </a>
    </div>
  );
}
