import Link from 'next/link';

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Support</h1>

        <section className="mt-10 space-y-4">
          <p className="text-zinc-300">
            Need help with Ruehl? You&apos;re in the right place. Here are answers to common questions and ways to get in
            touch. If your issue is account-specific, include details so we can help faster.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Contact us</h2>
          <p className="text-zinc-300">
            Email:{' '}
            <a href="mailto:support@ruehl.app" className="underline underline-offset-4">
              support@ruehl.app
            </a>
          </p>
          <p className="text-zinc-300">We aim to respond within a few business days.</p>
          <p className="text-zinc-300">
            For account-related issues, include your username in your message so support can locate your account more
            quickly.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">How do I delete my account?</h3>
            <p className="text-zinc-300">
              Open the app, then go to Settings → Account → Delete Account. After confirmation, your account enters a
              30-day soft-delete period. During that time, you can restore it by signing back in. After 30 days, your
              account is permanently deleted.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">I deleted my account by mistake. Can I get it back?</h3>
            <p className="text-zinc-300">
              Yes, if it has been less than 30 days since deletion. Sign back in with your email or phone and password.
              You&apos;ll see a restore prompt and can reactivate your account.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">I forgot my password.</h3>
            <p className="text-zinc-300">
              On the sign-in screen, tap &quot;Forgot password?&quot; and enter the email associated with your account. We&apos;ll send
              you a reset link.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">I&apos;m not getting sign-in or verification codes.</h3>
            <p className="text-zinc-300">
              Check your spam or junk folder first. If you signed up with a phone number, check that you have signal and
              that the number on your account is correct. If you still do not receive codes, email support@ruehl.app
              from the email address or phone number tied to your account.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">How do I report a post or user?</h3>
            <p className="text-zinc-300">
              Tap the &quot;...&quot; menu on any post or profile and select Report. Choose the reason that best fits and submit.
              Our team reviews reports and takes action based on severity and policy.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Someone is impersonating me. What should I do?</h3>
            <p className="text-zinc-300">
              Use the in-app report tool on the impersonating account, then email support@ruehl.app with proof of
              identity, such as a government ID or social profile that clearly shows your real account. Reports involving
              identity verification are prioritized.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">
              How do I switch my account type (Personal / Business / Media)?
            </h3>
            <p className="text-zinc-300">
              In the app, go to Settings → Account → Switch Account Type. Some account types may have different feature
              availability.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">My video is playing upside down.</h3>
            <p className="text-zinc-300">
              This is a known issue we&apos;re tracking. Please send the post ID to support@ruehl.app so we can investigate
              your specific case.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">A song or sound got muted on my post.</h3>
            <p className="text-zinc-300">
              This can happen if we receive a rights complaint or detect a music match. If you believe the mute is in
              error, contact support@ruehl.app and include the post ID and sound details.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">
              I&apos;m being harassed or someone is threatening me.
            </h3>
            <p className="text-zinc-300">
              Report the user immediately using the in-app report tool. If you believe you are in danger, contact local
              emergency services right away. For urgent platform-related safety issues, email support@ruehl.app with
              &quot;URGENT: Safety&quot; in the subject line.
            </p>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Privacy and data requests</h2>
          <p className="text-zinc-300">
            For privacy questions, data access requests, or to exercise your rights under U.S. state privacy laws, see
            our Privacy Policy or email support@ruehl.app. Include your username and the nature of your request.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">Status</h2>
          <p className="text-zinc-300">
            If Ruehl is down or experiencing widespread issues, we&apos;ll post updates on our community channels and respond
            to support emails as soon as possible.
          </p>
        </section>

        <footer className="mt-14 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
          <div className="flex items-center gap-4">
            <Link href="/" className="underline underline-offset-4 hover:text-white">
              Back to Home
            </Link>
            <Link href="/privacy" className="underline underline-offset-4 hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="underline underline-offset-4 hover:text-white">
              Terms
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
