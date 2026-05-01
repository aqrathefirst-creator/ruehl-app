'use client';

export default function AboutSection() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
      <h2 className="text-lg font-bold">About</h2>
      <div className="space-y-2">
        <a
          href="https://ruehl.app/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-gray-400 transition hover:text-white"
        >
          Terms of Service →
        </a>
        <a
          href="https://ruehl.app/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-gray-400 transition hover:text-white"
        >
          Privacy Policy →
        </a>
        <a href="mailto:support@ruehl.app" className="block text-sm text-gray-400 transition hover:text-white">
          Contact support →
        </a>
      </div>
      <p className="border-t border-white/10 pt-3 text-sm text-gray-500">
        App version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}
      </p>
    </section>
  );
}
