import Link from 'next/link';

/** Anonymous homepage — Path D marketing shell (unchanged copy). */
export default function MarketingLanding() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-2xl text-center">
        <h1 className="mb-6 text-6xl font-bold tracking-tight md:text-8xl">
          <span className="text-[#a855f7]">RUEHL</span>
        </h1>
        <p className="mb-4 text-xl text-gray-300 md:text-2xl">Voice-first social.</p>
        <p className="mb-12 text-lg text-gray-500">Where real ones live.</p>

        <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="https://apps.apple.com/app/ruehl"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-gray-100"
          >
            Download for iOS
          </a>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-gray-700 px-6 py-3 font-medium transition hover:border-gray-500"
          >
            Sign In
          </Link>
        </div>

        <p className="text-sm text-gray-600">Web app coming soon.</p>
      </div>
    </main>
  );
}
