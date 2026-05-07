import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <p className="text-sm text-zinc-500">Last updated: May 7, 2026</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ruehl Terms of Service</h1>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p className="text-zinc-300">
            These Terms of Service (&quot;Terms&quot;) govern your use of Ruehl, the Service, operated by Etcetera Group LLC,
            a Wyoming limited liability company. By creating an account or using the Service, you agree to these Terms
            and to our Privacy Policy. If you do not agree, do not use Ruehl.
          </p>
          <p className="text-zinc-300">
            We wrote these Terms in plain English. They are a binding agreement between you and Etcetera Group LLC.
            Please read them carefully before you post content, interact with others, or use business tools. If you have
            questions, contact support@ruehl.app before continuing.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Eligibility</h2>
          <p className="text-zinc-300">
            You must be at least 13 years old to use Ruehl. If you are between 13 and 17, you confirm that you have
            permission from a parent or guardian.
          </p>
          <p className="text-zinc-300">
            If you use Ruehl on behalf of an organization, including a Business or Media account, you confirm that you
            have authority to bind that organization to these Terms. In that case, &quot;you&quot; means both you and the
            organization you represent.
          </p>
          <p className="text-zinc-300">
            You may not use Ruehl if your account was previously removed for serious or repeated violations, unless we
            give you written permission to return.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. Your account</h2>
          <p className="text-zinc-300">
            You are responsible for the accuracy of information you provide when you sign up and while you use your
            profile. Keep your username, contact details, and account category up to date so we can communicate with you
            about account and security issues.
          </p>
          <p className="text-zinc-300">
            You are responsible for keeping your password confidential and for all activity on your account. Do not share
            your credentials with others. If you suspect unauthorized access, notify us immediately at support@ruehl.app
            so we can help secure your account.
          </p>
          <p className="text-zinc-300">
            We may verify identity for some account types or safety-sensitive actions. If we request verification, you
            agree to provide accurate information. We may limit features or access when verification is incomplete,
            inconsistent, or fraudulent.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. User content</h2>
          <p className="text-zinc-300">
            You keep ownership of the content you post, including photos, videos, audio, voice memos, and text.
          </p>
          <p className="text-zinc-300">
            By posting content, you grant Etcetera Group LLC a worldwide, non-exclusive, royalty-free license to host,
            store, transmit, display, reformat, and distribute your content for the purpose of operating, providing, and
            promoting the Service.
          </p>
          <p className="text-zinc-300">
            This license ends when you delete your content or your account, except for content already shared with other
            users (who may retain copies in their own feeds, devices, or caches) and except as required for backup,
            security, fraud prevention, or legal retention.
          </p>
          <p className="text-zinc-300">
            You represent that you have all rights needed to post your content, including rights to music, audio clips,
            images, trademarks, and likenesses appearing in your posts.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Acceptable use</h2>
          <p className="text-zinc-300">You agree NOT to do any of the following on Ruehl:</p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-300">
            <li>Post illegal, harmful, threatening, harassing, defamatory, hateful, or sexually explicit content</li>
            <li>
              Infringe anyone&apos;s intellectual property rights, including using copyrighted music, images, or video
              without permission
            </li>
            <li>Impersonate any person or organization</li>
            <li>Harvest, scrape, or extract data from the Service through automated means</li>
            <li>Reverse engineer, decompile, or attempt to access source code or non-public APIs</li>
            <li>Use the Service to send spam, malware, or phishing</li>
            <li>Interfere with or disrupt the Service&apos;s infrastructure</li>
            <li>Create accounts using automated means or for the purpose of evading bans</li>
            <li>Use the Service to violate any law</li>
          </ul>
          <p className="text-zinc-300">
            These rules protect users and keep Ruehl usable. Violations can lead to content removal, temporary limits,
            suspension, or permanent account termination.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Music and sounds</h2>
          <p className="text-zinc-300">
            Ruehl includes features for attaching music to posts. Music search results may come from Apple iTunes and
            Apple Music. Previews are short audio segments licensed for preview use only.
          </p>
          <p className="text-zinc-300">
            User-uploaded sounds and voice recordings (&quot;ruehl_sounds&quot;) are subject to your own representations that you
            have the rights to upload them. You are responsible for the music and audio you attach to your posts.
          </p>
          <p className="text-zinc-300">
            We may mute, remove, or limit audio features if we receive a rights complaint, detect misuse, or need to
            comply with licensing or legal requirements.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">7. Reporting and moderation</h2>
          <p className="text-zinc-300">
            You can report content or accounts that violate these Terms through in-app reporting. Please provide clear
            details so our team can review quickly.
          </p>
          <p className="text-zinc-300">
            We may, at our discretion, remove content, suspend accounts, or terminate access for violations. We do not
            commit to reviewing all content but reserve the right to do so.
          </p>
          <p className="text-zinc-300">
            Moderation outcomes can vary depending on severity, repeated behavior, safety risk, and legal obligations. We
            may also preserve evidence when required for security or compliance.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">8. Termination</h2>
          <p className="text-zinc-300">
            You can delete your account in the app at any time through Settings → Account → Delete Account.
          </p>
          <p className="text-zinc-300">
            We may suspend or terminate your account with or without notice for violations of these Terms or applicable
            law, or for sustained inactivity.
          </p>
          <p className="text-zinc-300">
            Sections of these Terms that by their nature should survive termination, including ownership,
            indemnification, limitation of liability, and governing law, will survive.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">9. Changes to the Service</h2>
          <p className="text-zinc-300">
            We may add, modify, or remove features at any time. We may also limit usage of certain features for
            fairness, abuse prevention, or operational reasons.
          </p>
          <p className="text-zinc-300">
            We are not required to keep any specific feature available forever. We may test new experiences, set account
            limits, or retire tools that are underused or unsafe.
          </p>
          <p className="text-zinc-300">
            When possible, we will communicate major changes in advance. Some updates may happen immediately for security
            reasons.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">10. Changes to these Terms</h2>
          <p className="text-zinc-300">
            We may update these Terms from time to time. Material changes will be communicated in-app or by email.
          </p>
          <p className="text-zinc-300">
            Continued use after a change means you accept the updated Terms. If you do not agree, you should stop using
            Ruehl and delete your account.
          </p>
          <p className="text-zinc-300">
            The &quot;Last updated&quot; date at the top shows when the current version took effect.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">11. Disclaimers</h2>
          <p className="text-zinc-300">
            The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind, whether express or
            implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, or
            availability.
          </p>
          <p className="text-zinc-300">
            We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
          </p>
          <p className="text-zinc-300">
            You understand that online services can have outages, delays, and third-party dependency failures. You use
            Ruehl at your own risk to the extent permitted by law.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">12. Limitation of liability</h2>
          <p className="text-zinc-300">
            To the maximum extent permitted by law, Etcetera Group LLC and its officers, employees, and contractors are
            not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits,
            data, goodwill, or other intangible losses, arising out of or related to your use of the Service.
          </p>
          <p className="text-zinc-300">
            Our aggregate liability for any claim related to the Service is limited to one hundred U.S. dollars
            ($100.00) or the amount you paid us in the twelve months before the claim, whichever is greater.
          </p>
          <p className="text-zinc-300">
            Some jurisdictions do not allow certain limitations, so portions of this section may not apply to you. In
            those cases, liability is limited to the fullest extent allowed by applicable law.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">13. Indemnification</h2>
          <p className="text-zinc-300">
            You agree to indemnify and hold harmless Etcetera Group LLC and its officers, employees, and contractors
            from any claims, damages, liabilities, and expenses (including reasonable attorneys&apos; fees) arising from your
            content, your use of the Service, or your violation of these Terms.
          </p>
          <p className="text-zinc-300">
            This includes claims from third parties related to intellectual property, privacy rights, unlawful conduct,
            or misuse of accounts and tools under your control.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">14. Governing law and disputes</h2>
          <p className="text-zinc-300">
            These Terms are governed by the laws of the State of Wyoming, without regard to conflict-of-law principles.
          </p>
          <p className="text-zinc-300">
            You agree that any dispute arising from these Terms or the Service will be resolved in the state or federal
            courts located in Wyoming, and you submit to the personal jurisdiction of those courts.
          </p>
          <p className="text-zinc-300">
            Before filing a formal claim, you agree to contact us at support@ruehl.app so we can try to resolve the
            issue informally.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">15. Contact</h2>
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
            <Link href="/privacy" className="underline underline-offset-4 hover:text-white">
              Privacy
            </Link>
            <Link href="/support" className="underline underline-offset-4 hover:text-white">
              Support
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
