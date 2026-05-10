import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <p className="text-sm text-zinc-500">Last updated: May 10, 2026</p>
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
          <h2 className="text-2xl font-semibold text-white">7. Disappearing messages (personal chats)</h2>
          <p className="text-zinc-300">
            When you message another personal-account user, your conversation defaults to ephemeral mode. This means:
          </p>
          <p className="text-zinc-300">
            Messages remain visible to both participants while they are actively in the chat.
          </p>
          <p className="text-zinc-300">
            When you leave a chat (by navigating away, switching apps, or locking your phone), unpinned messages from
            before you left will no longer appear when you return.
          </p>
          <p className="text-zinc-300">
            Each user&apos;s view tracks independently. If your conversation partner stays in the chat, they will
            continue to see all messages until they too leave.
          </p>
          <p className="text-zinc-300">
            Messages you pin (see below) remain visible across all returns.
          </p>
          <p className="text-zinc-300">
            Ephemeral messages are stored on our servers for up to 30 days for delivery reliability and operational
            integrity, after which they are automatically and permanently deleted. We do not retain ephemeral messages
            indefinitely.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">8. Pinned messages</h2>
          <p className="text-zinc-300">
            You can pin a message in any chat by tapping and holding on it. Pinned messages remain visible to both you
            and your conversation partner across leave/return cycles.
          </p>
          <p className="text-zinc-300">
            Either participant in a personal-to-personal chat can pin a message. Pinned messages are not subject to the
            30-day automatic deletion described above; they remain stored on our servers until manually unpinned by
            either party. Once unpinned, they follow the standard ephemeral retention rules.
          </p>
          <p className="text-zinc-300">
            Pinning a message in a brand chat (a chat involving a business account) saves it within the conversation
            but does not change the conversation&apos;s standard retention behavior.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">9. Screenshot notifications</h2>
          <p className="text-zinc-300">
            When you take a screenshot inside a personal-to-personal chat on Ruehl, we attempt to notify the other
            participant that a screenshot was taken. This notification appears as both a push notification and an
            inline indicator in the conversation.
          </p>
          <p className="text-zinc-300">
            Screenshot detection is supported reliably on iOS. On Android, detection depends on your device&apos;s
            operating system version; on Android 14 and later, detection works without additional permissions, but on
            earlier Android versions, detection may be limited or unavailable. We do not request additional storage or
            media access permissions to enable screenshot detection.
          </p>
          <p className="text-zinc-300">
            Screenshot notifications apply only to personal-to-personal chats. They do not apply to brand or business
            chats. Other forms of capture (using a separate camera, screen recording on certain devices) cannot always
            be detected, and we encourage you to share content only with people you trust.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">10. Brand and business chats</h2>
          <p className="text-zinc-300">
            Chats that involve a brand, business, media, or restaurant account use standard retention rules. Messages in
            these chats are not automatically deleted and remain stored on our servers as part of normal conversation
            history. The disappearing messages and screenshot notification features described above do not apply.
          </p>
          <p className="text-zinc-300">
            Senders may unsend their own messages in brand chats at any time; unsent messages become invisible to all
            participants and are filtered from the conversation view, though server records may be retained per the
            preservation requirements below.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">11. Server-side retention and deletion</h2>
          <p className="text-zinc-300">
            Our retention practices are designed to balance privacy with operational needs and legal obligations.
          </p>
          <p className="text-zinc-300">
            Ephemeral messages (personal-to-personal): up to 30 days, then permanently deleted.
          </p>
          <p className="text-zinc-300">Pinned messages: stored until unpinned by either participant.</p>
          <p className="text-zinc-300">
            Brand/business chat messages: retained as part of normal account history.
          </p>
          <p className="text-zinc-300">
            Account-level data and metadata about your messages (for example, participant identifiers, timestamps): may
            be retained for operational, security, fraud prevention, and analytics purposes per our overall retention
            policy.
          </p>
          <p className="text-zinc-300">
            When you delete your Ruehl account, your account-associated data is subject to a 30-day grace period, after
            which it is permanently deleted along with your messages.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">12. Preservation for legal process</h2>
          <p className="text-zinc-300">
            We may retain otherwise deletable messages and account data when required by law. Specifically, when we
            receive a valid preservation request from a governmental entity under the U.S. Stored Communications Act
            (18 U.S.C. 2703(f)), or an equivalent legal instrument in another jurisdiction, we will preserve the
            requested data for 90 days, extendable for an additional 90 days upon a renewed request.
          </p>
          <p className="text-zinc-300">
            Preserved data is not made available to law enforcement absent a separate, valid legal process (for example,
            a subpoena, court order, or search warrant) compelling disclosure. We notify users about legal process
            seeking the disclosure of their records when permitted by law.
          </p>
          <p className="text-zinc-300">
            Preservation holds may apply to messages that would otherwise be deleted under our standard retention
            windows, including ephemeral and unpinned messages.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">13. Your rights and choices</h2>
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
          <h2 className="text-2xl font-semibold text-white">14. Children</h2>
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
          <h2 className="text-2xl font-semibold text-white">15. Teen users (13–17)</h2>
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
          <h2 className="text-2xl font-semibold text-white">16. Security</h2>
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
          <h2 className="text-2xl font-semibold text-white">17. International users</h2>
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
          <h2 className="text-2xl font-semibold text-white">18. Changes to this policy</h2>
          <p className="text-zinc-300">
            We may update this privacy policy from time to time. If a change is material, we will provide notice in the
            app or by email when appropriate.
          </p>
          <p className="text-zinc-300">
            On May 10, 2026, we updated this policy to disclose new chat features, including ephemeral messages, pinned
            messages, screenshot notifications, server-side retention, and preservation for legal process.
          </p>
          <p className="text-zinc-300">Your continued use of Ruehl after a policy update means you accept the updated policy.</p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">19. Contact us</h2>
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
