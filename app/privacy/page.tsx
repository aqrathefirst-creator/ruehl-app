import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <p className="text-sm text-zinc-500">Last updated: May 7, 2026</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ruehl Privacy Policy</h1>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p className="text-zinc-300">
            Ruehl is operated by Etcetera Group LLC, a Wyoming limited liability company. In this policy, we call
            ourselves &quot;we,&quot; &quot;us,&quot; or &quot;our.&quot; This privacy policy explains what we collect when you use Ruehl,
            which we call the Service, how we use that information, when we share it, and what rights you have.
          </p>
          <p className="text-zinc-300">
            We wrote this in plain language so you can understand it quickly. If you use Ruehl, you agree to this
            policy. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Information we collect</h2>
          <p className="text-zinc-300">
            We collect information you provide directly. This includes your account details, profile details, content,
            and messages you send to us for support. We also collect technical information that helps the app run.
          </p>
          <p className="text-zinc-300">
            Account information includes your email address or phone number, password, username, full name, date of
            birth, account type such as Personal, Business, or Media, and your bio. We do not store your password as
            plain text. Passwords are stored using secure hashing practices.
          </p>
          <p className="text-zinc-300">
            Profile content includes your avatar image and links you choose to place on your profile. If you update your
            profile, we store the latest values and may keep earlier records for security, fraud prevention, or system
            backup periods.
          </p>
          <p className="text-zinc-300">
            Content you post includes photos, videos, audio recordings, voice memos used for POWR posts, captions,
            location labels you attach, hashtags, and sound metadata. Sound metadata can include track references,
            artist names, and related identifiers needed to render and replay your post.
          </p>
          <p className="text-zinc-300">
            Social interaction data includes who you follow, who follows you, likes, comments, mentions, lifts, drops,
            echoes, and tune-ins. We store this so social features work correctly and so your feed and notifications can
            reflect current activity.
          </p>
          <p className="text-zinc-300">
            Device and technical data includes push notification identifiers such as Expo push tokens, basic performance
            signals such as cold start and first frame timings, and crash information if or when crash reporting is
            enabled in production. We use this to maintain reliability and troubleshoot issues.
          </p>
          <p className="text-zinc-300">
            We also collect communications with us, including support emails you send to support@ruehl.app or other
            support channels we may provide.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. How we use your information</h2>
          <p className="text-zinc-300">
            We use your information to provide and operate Ruehl. That includes creating your account, authenticating
            you when you sign in, storing your posts, and delivering your content to other users based on your account
            settings.
          </p>
          <p className="text-zinc-300">
            We use account and security information to protect your account, detect suspicious access, and enforce
            account integrity controls such as sign-in verification and trust checks. This helps reduce abuse and
            unauthorized access.
          </p>
          <p className="text-zinc-300">
            We use content and social graph data to deliver feeds, profile pages, notifications, and social interactions.
            For example, if someone follows you or lifts your post, we process that event so the action appears in-app.
          </p>
          <p className="text-zinc-300">
            We use your contact details and device tokens to send transactional messages. This includes sign-in codes,
            account-related notices, and push notifications tied to activity on your account.
          </p>
          <p className="text-zinc-300">
            We use relevant data to detect abuse, investigate policy violations, enforce community standards, prevent
            fraud, and respond to valid legal requests. We may also use technical logs to investigate outages and
            security incidents.
          </p>
          <p className="text-zinc-300">
            We use technical telemetry and operational logs to improve the Service. That includes debugging, performance
            tuning, quality checks, and feature reliability work.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Third parties we share with</h2>
          <p className="text-zinc-300">
            We use service providers to operate Ruehl. These providers process data on our behalf under contractual
            obligations and are limited to the services they perform for us.
          </p>
          <p className="text-zinc-300">
            Supabase, operated by Supabase, Inc., is used for database services, authentication, and storage. This means
            account records, content metadata, and related application data are processed through Supabase systems.
          </p>
          <p className="text-zinc-300">
            Cloudflare is used for video streaming through Cloudflare Stream, content delivery through cdn.ruehl.app,
            and image rendering pathways used by the app and web experience.
          </p>
          <p className="text-zinc-300">
            Apple and Google may process notification traffic for delivery. On iOS, push notifications route through
            APNs. On Android, push notifications route through FCM. Depending on your platform and account settings,
            these providers may process message metadata required for delivery.
          </p>
          <p className="text-zinc-300">
            Resend is used for transactional email delivery, including sign-in verification codes sent by email when
            those flows are enabled for your account.
          </p>
          <p className="text-zinc-300">
            Apple iTunes and Apple Music APIs may be used when you search for music to attach to posts. Your music
            search queries are sent to Apple for matching results.
          </p>
          <p className="text-zinc-300">We do not sell your personal information.</p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Public content</h2>
          <p className="text-zinc-300">
            Content you choose to make public can be seen by other users. This may include profile details, posts,
            drops, and related activity. If your account is public, your content may be visible to people who are not
            signed in.
          </p>
          <p className="text-zinc-300">
            Your username and public content can also become discoverable on the web. If public pages are reachable,
            search engines may index them. You should avoid posting personal details you do not want to be public.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Data retention</h2>
          <p className="text-zinc-300">
            We keep your account data while your account is active so the Service can function. Retention periods can
            vary by data type, but we generally retain active account information, profile information, and content as
            long as needed to provide the Service.
          </p>
          <p className="text-zinc-300">
            If you delete your account in the app, we begin a 30-day soft-delete period. During this period, your
            account can be restored by signing back in and following restore prompts.
          </p>
          <p className="text-zinc-300">
            After 30 days, we delete account data from active systems, except for limited records we are required to
            retain for legal compliance, security, abuse prevention, or fraud investigation purposes.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">7. Your rights and choices</h2>
          <p className="text-zinc-300">
            You can access and update core profile details in the app, including username-adjacent profile information,
            avatar content, and account-facing metadata made editable in settings.
          </p>
          <p className="text-zinc-300">
            You can request deletion in the app by going to Settings, then Account, then Delete Account. You can also
            ask for account deletion by emailing support@ruehl.app.
          </p>
          <p className="text-zinc-300">
            You can restore your account within 30 days after deletion by signing in and completing the restoration
            steps shown in the app.
          </p>
          <p className="text-zinc-300">
            Residents of California, Colorado, Connecticut, Virginia, and Utah may have additional rights under state
            law, including rights to request access, correction, deletion, and portability of personal information.
            Contact support@ruehl.app to make a request.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">8. Children</h2>
          <p className="text-zinc-300">
            Ruehl is intended for users who are 13 years of age or older. We do not knowingly collect personal
            information from children under 13.
          </p>
          <p className="text-zinc-300">
            If you believe a child under 13 has provided personal information to us, contact support@ruehl.app. We will
            review the report and take appropriate deletion steps.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">9. Teen users (13–17)</h2>
          <p className="text-zinc-300">
            Some U.S. states require additional disclosures for teen users. If you are between 13 and 17, your parent
            or guardian may have additional rights related to your account or your personal information under applicable
            law.
          </p>
          <p className="text-zinc-300">
            If you or your parent or guardian want to exercise rights related to your account, contact support@ruehl.app
            and we will explain the process that applies to your request.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">10. Security</h2>
          <p className="text-zinc-300">
            We use industry-standard safeguards designed to protect your information. These include encrypted
            connections, encrypted password storage, and access controls for internal systems.
          </p>
          <p className="text-zinc-300">
            No system is perfectly secure. You are responsible for protecting your account credentials and keeping your
            password confidential. If you think your account has been compromised, contact us as soon as possible.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">11. International users</h2>
          <p className="text-zinc-300">
            Ruehl is operated from the United States. If you access or use the Service from outside the United States,
            you understand that your information may be processed and stored in the United States.
          </p>
          <p className="text-zinc-300">
            Data protection laws in your jurisdiction may differ from U.S. law. By using the Service, you acknowledge
            this transfer and processing structure.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">12. Changes to this policy</h2>
          <p className="text-zinc-300">
            We may update this privacy policy from time to time. If a change is material, we will provide notice in the
            app or by email when appropriate.
          </p>
          <p className="text-zinc-300">Your continued use of Ruehl after a policy update means you accept the updated policy.</p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">13. Contact us</h2>
          <p className="text-zinc-300">Etcetera Group LLC</p>
          <p className="text-zinc-300">Wyoming, USA</p>
          <p className="text-zinc-300">
            Email:{' '}
            <a href="mailto:support@ruehl.app" className="underline underline-offset-4">
              support@ruehl.app
            </a>
          </p>
        </section>

        <footer className="mt-14 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
          <div className="flex items-center gap-4">
            <Link href="/" className="underline underline-offset-4 hover:text-white">
              Back to Home
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
