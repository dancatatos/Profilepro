/**
 * Terms of Service — public page at /terms.
 *
 * Working baseline modeled on standard SaaS terms with PH-specific
 * tweaks (jurisdiction, refund policy, MLM-targeted acceptable use).
 *
 * IMPORTANT: not legal advice. Have a Filipino lawyer review before
 * scaling — especially the limitation-of-liability and
 * indemnification clauses, which vary by jurisdiction.
 */

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CURRENT_CONSENT_VERSION } from "@/lib/consent";

export const metadata = {
  title: "Terms of Service · Credibly",
  description:
    "The rules of using Credibly — what you can do, what you can't, and how we handle billing, suspensions, and disputes.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <header className="border-b border-white/[0.06] bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm text-white/55 hover:text-white"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Last updated: {CURRENT_CONSENT_VERSION}
        </p>

        <Prose>
          <p className="lead">
            These Terms govern your use of Credibly. By creating an
            account or using the service, you agree to be bound by
            them. If you don&apos;t agree, don&apos;t use the service.
          </p>

          <H2>1. The service</H2>
          <p>
            Credibly is a software-as-a-service platform for building
            credibility profiles, sales funnels, follow-up pipelines,
            and related lead-conversion tools. The service is provided
            on an &ldquo;as is&rdquo; basis and we may add, change, or
            remove features at any time.
          </p>

          <H2>2. Your account</H2>
          <ul>
            <li>
              You must be at least 18 years old to use Credibly.
            </li>
            <li>
              You&apos;re responsible for safeguarding your password
              and any activity that happens under your account.
            </li>
            <li>
              Provide accurate, complete information at signup. Don&apos;t
              create accounts for other people without their permission.
            </li>
            <li>
              One account per person unless you&apos;ve been granted an
              explicit exception (e.g. team plans).
            </li>
          </ul>

          <H2>3. Acceptable use</H2>
          <p>You agree NOT to use Credibly to:</p>
          <ul>
            <li>
              Promote pyramid schemes, illegal investment vehicles, or
              any activity prohibited under Philippine law.
            </li>
            <li>
              Send spam or unsolicited bulk messages to leads you
              collected.
            </li>
            <li>
              Misrepresent your identity, credentials, awards, or
              affiliations.
            </li>
            <li>
              Upload malware, exploit security flaws, scrape data at
              scale, or interfere with the service.
            </li>
            <li>
              Infringe anyone&apos;s intellectual property, post
              defamatory content, or share another person&apos;s
              personal data without their consent.
            </li>
            <li>
              Resell or sublicense the service without our written
              permission.
            </li>
          </ul>
          <p>
            Network marketing and affiliate marketing are EXPLICITLY
            allowed — Credibly is built for them. But the underlying
            business must be legitimate, compliant with PH SEC / DTI
            rules, and conducted in good faith.
          </p>

          <H2>4. Your content</H2>
          <p>
            You retain ownership of everything you create on Credibly:
            your profile copy, photos, lead lists, pipeline templates,
            and AI-generated content based on your inputs. You grant
            us a limited, non-exclusive license to host, display, and
            transmit that content solely to provide the service to you
            and your audience.
          </p>
          <p>
            If you publish your profile or funnel publicly, you accept
            that the content will be visible to anyone with the link.
          </p>

          <H2>5. Plans, billing, and refunds</H2>
          <ul>
            <li>
              Paid plans are billed via Gumroad. Pricing is shown on
              the <Link href="/#pricing">pricing page</Link>.
            </li>
            <li>
              Your subscription auto-renews at the same interval
              (monthly or annual) unless you cancel before renewal.
            </li>
            <li>
              <strong>Refund policy:</strong> we offer a 7-day refund
              from your first paid charge, no questions asked. After
              7 days, paid time is non-refundable but you keep access
              until the end of your billing cycle.
            </li>
            <li>
              If we discontinue a paid feature, you&apos;ll receive
              prorated credit toward another plan or a refund of the
              unused portion.
            </li>
          </ul>

          <H2>6. AI-generated content</H2>
          <p>
            Credibly uses Google Gemini to generate suggested
            headlines, bios, follow-up messages, and other copy based
            on your inputs. AI output is a starting point, not finished
            work:
          </p>
          <ul>
            <li>You&apos;re responsible for reviewing and editing.</li>
            <li>
              Don&apos;t use AI output to make medical, financial, or
              legal claims you can&apos;t back up.
            </li>
            <li>
              Don&apos;t pass off AI-generated testimonials as real
              endorsements.
            </li>
          </ul>

          <H2>7. Suspension and termination</H2>
          <p>
            We may suspend or terminate your account if you violate
            these Terms, abuse the service, or expose us to legal risk
            (e.g. credible accusations of fraud or scam content). When
            possible we&apos;ll warn you first and give you a chance to
            cure. For serious or repeat violations we may suspend
            without notice.
          </p>
          <p>
            You can close your account anytime from{" "}
            <Link href="/settings">/settings</Link>. After deletion we
            purge your data within 30 days, subject to retention
            exceptions in the{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <H2>8. Disclaimers</H2>
          <p>
            Credibly is provided &ldquo;as is&rdquo; and &ldquo;as
            available.&rdquo; We don&apos;t guarantee that the service
            will be uninterrupted, error-free, or that AI outputs will
            be accurate. We don&apos;t guarantee any particular result
            from using Credibly — your success depends on factors
            outside our control, including your own effort and the
            quality of your business.
          </p>

          <H2>9. Limitation of liability</H2>
          <p>
            To the maximum extent permitted by Philippine law, Credibly
            and its affiliates are not liable for any indirect,
            incidental, consequential, special, or punitive damages,
            or for lost profits or lost data. Our total liability for
            any claim related to the service is limited to the amount
            you paid us in the 12 months before the claim arose.
          </p>

          <H2>10. Indemnification</H2>
          <p>
            You agree to defend and hold Credibly harmless from any
            claims arising out of your content, your use of the
            service, your interactions with your leads, or your
            violation of these Terms.
          </p>

          <H2>11. Governing law &amp; disputes</H2>
          <p>
            These Terms are governed by the laws of the Republic of
            the Philippines. Any dispute arising out of or related to
            these Terms or the service will be resolved exclusively
            in the courts of Metro Manila.
          </p>
          <p>
            Before filing suit, we strongly encourage you to email{" "}
            <a href="mailto:support@crediblyai.com">
              support@crediblyai.com
            </a>{" "}
            so we can try to resolve the issue directly.
          </p>

          <H2>12. Changes to these Terms</H2>
          <p>
            We may update these Terms from time to time. Material
            changes will be announced via email (if you opted in) and
            shown with a new &ldquo;Last updated&rdquo; date here.
            Continuing to use Credibly after the changes constitutes
            acceptance.
          </p>

          <H2>13. Contact</H2>
          <p>
            <a href="mailto:support@crediblyai.com">
              support@crediblyai.com
            </a>
          </p>

          <hr className="my-8 border-white/[0.06]" />
          <p className="text-xs text-white/40">
            See also our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </Prose>
      </main>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-white/75 [&_.lead]:text-base [&_.lead]:text-white/80 [&_a]:text-electric-300 [&_a:hover]:text-electric-200 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:marker:text-white/30">
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-xl font-bold text-white sm:text-2xl">
      {children}
    </h2>
  );
}
