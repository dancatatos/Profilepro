/**
 * Privacy Policy — public page at /privacy.
 *
 * Drafted to satisfy the Philippine Data Privacy Act (RA 10173) and
 * align with GDPR principles. Specific to Credibly's actual data
 * practices: Firebase Auth / Firestore for storage, Gumroad for
 * payments, Resend for transactional email, Gemini AI for content
 * generation, no third-party advertising trackers.
 *
 * IMPORTANT: this is a working baseline, not legal advice. Before
 * scaling beyond a few hundred users (or accepting EU customers), have
 * a Filipino lawyer specialising in tech / DPA review it.
 */

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CURRENT_CONSENT_VERSION } from "@/lib/consent";

export const metadata = {
  title: "Privacy Policy · Credibly",
  description:
    "How Credibly collects, uses, and protects your personal data — in line with the Philippine Data Privacy Act and GDPR principles.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      {/* Lightweight header — matches the marketing site nav. */}
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Last updated: {CURRENT_CONSENT_VERSION}
        </p>

        <Prose>
          <p className="lead">
            Credibly (&ldquo;<strong>Credibly</strong>,&rdquo; &ldquo;
            <strong>we</strong>,&rdquo; &ldquo;<strong>our</strong>,&rdquo;
            or &ldquo;<strong>us</strong>&rdquo;) takes your privacy
            seriously. This policy explains what personal data we collect
            when you use{" "}
            <Link href="/">crediblyai.com</Link>, why we collect it, how
            we store it, and the rights you have over it under the
            Philippine Data Privacy Act of 2012 (RA 10173) and comparable
            international frameworks.
          </p>

          <H2>1. Who we are</H2>
          <p>
            Credibly is an AI-powered credibility profile and follow-up
            tool aimed at network marketers, recruiters, coaches, and
            online sellers — primarily in the Philippines. We act as both
            a <strong>data controller</strong> for our customer accounts
            and a <strong>data processor</strong> for the leads our
            customers capture through profiles and funnels built on the
            platform. See Section 7 for what that distinction means in
            practice.
          </p>

          <H2>2. What we collect</H2>
          <ul>
            <li>
              <strong>Account details</strong> — your name, email
              address, password hash (we never store passwords in
              plaintext; Firebase Authentication handles them), profile
              photo URL, and any Google-account identifiers if you sign
              up with Google.
            </li>
            <li>
              <strong>Profile content you create</strong> — headlines,
              biographies, testimonials, social links, business
              information, images you upload, and any other content you
              add to your public profile or funnels. This content is
              public by design.
            </li>
            <li>
              <strong>Leads captured through your profile / funnel</strong>{" "}
              — names, emails, and phone numbers of people who submit a
              lead-capture form on a profile or funnel you control. We
              process this data on your behalf (see Section 7).
            </li>
            <li>
              <strong>Payment information</strong> — handled entirely by
              our payment processor (Gumroad). We receive a license key
              and your billing email; we do <em>not</em> store card
              numbers or full payment credentials.
            </li>
            <li>
              <strong>Usage analytics</strong> — aggregated counts of
              profile views, button clicks, share events, and form
              submissions, used to power your in-app dashboard and
              detect abuse. We do not use third-party advertising
              cookies or cross-site trackers.
            </li>
            <li>
              <strong>Technical metadata</strong> — IP address (briefly,
              for abuse prevention), browser type, and device type, as
              collected by Firebase and Vercel logs.
            </li>
          </ul>

          <H2>3. Why we collect it</H2>
          <p>We process your data for these specific purposes:</p>
          <ul>
            <li>
              <strong>Service delivery</strong> — creating your account,
              building your profile, capturing leads, sending
              transactional emails (e.g. password resets, receipts),
              and rendering your public profile to visitors.
            </li>
            <li>
              <strong>AI content generation</strong> — when you click
              &ldquo;Generate with AI&rdquo;, we send your inputs (niche,
              tone, audience answers) to Google Gemini to produce
              suggested headlines, bios, CTAs, and follow-up messages.
              We do not send leads&apos; personal data to AI.
            </li>
            <li>
              <strong>Billing</strong> — verifying paid subscriptions via
              Gumroad license keys.
            </li>
            <li>
              <strong>Support &amp; abuse prevention</strong> — debugging
              issues you report, detecting fraudulent signups, and
              enforcing our Terms of Service.
            </li>
            <li>
              <strong>Product updates</strong> — only if you opted in to
              marketing emails at signup. You can opt out anytime via
              the unsubscribe link in any marketing email.
            </li>
          </ul>

          <H2>4. Who we share it with</H2>
          <p>
            We don&apos;t sell your data. We share with specific
            third-party processors who help us deliver the service:
          </p>
          <ul>
            <li>
              <strong>Google Firebase</strong> (Authentication, Firestore
              database, Cloud Storage) — primary storage and auth
              backbone.
            </li>
            <li>
              <strong>Vercel</strong> — hosting and content delivery for
              the Credibly application.
            </li>
            <li>
              <strong>Gumroad</strong> — payment processing for paid
              plans.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery
              (password resets, receipts, optional product updates).
            </li>
            <li>
              <strong>Google Gemini</strong> — AI content generation
              when you opt in by using the AI features.
            </li>
            <li>
              <strong>Law enforcement</strong> — only when compelled by
              a valid legal order under Philippine law.
            </li>
          </ul>
          <p>
            Each processor is bound by its own privacy commitments. We
            do not enable advertising trackers (Facebook Pixel, Google
            Ads, etc.) on the application surface.
          </p>

          <H2>5. How long we keep it</H2>
          <ul>
            <li>
              <strong>Active accounts</strong> — for as long as your
              account exists.
            </li>
            <li>
              <strong>Deleted accounts</strong> — up to 30 days in our
              backup snapshots, after which the data is permanently
              purged.
            </li>
            <li>
              <strong>Billing records</strong> — retained for 10 years
              as required by Philippine tax law.
            </li>
            <li>
              <strong>Aggregated analytics</strong> — may be kept
              indefinitely in non-identifiable form.
            </li>
          </ul>

          <H2>6. Your rights (PH DPA &amp; GDPR)</H2>
          <p>You have the right to:</p>
          <ul>
            <li>
              <strong>Access</strong> — request a copy of the data we
              hold about you.
            </li>
            <li>
              <strong>Correct</strong> — update inaccurate or
              incomplete personal data (most of which you can edit
              directly in your profile).
            </li>
            <li>
              <strong>Delete</strong> — close your account and have
              your data removed, subject to the retention exceptions in
              Section 5.
            </li>
            <li>
              <strong>Object &amp; restrict</strong> — opt out of
              marketing or specific processing activities.
            </li>
            <li>
              <strong>Portability</strong> — export your profile and
              leads in a machine-readable format.
            </li>
            <li>
              <strong>Complain</strong> — lodge a complaint with the
              Philippine National Privacy Commission (NPC) at{" "}
              <a
                href="https://privacy.gov.ph"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy.gov.ph
              </a>{" "}
              if you believe your rights have been violated.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@crediblyai.com">
              privacy@crediblyai.com
            </a>
            . We respond within 7 business days, as required by the
            DPA&apos;s Implementing Rules.
          </p>

          <H2>7. Leads captured through your profile or funnel</H2>
          <p>
            When you (a Credibly customer) build a profile or funnel
            that includes a lead-capture form, you are the{" "}
            <strong>personal information controller</strong> for the
            data submitted by your leads. Credibly is the{" "}
            <strong>personal information processor</strong>: we store
            the data on your behalf and make it available to you via
            your dashboard, but we don&apos;t use it for our own
            purposes (no marketing, no aggregation, no resale).
          </p>
          <p>
            As the controller, you are responsible for:
          </p>
          <ul>
            <li>
              Obtaining lawful consent from your leads before collecting
              their data (display a clear notice on your form when
              required for your industry).
            </li>
            <li>
              Responding to your leads&apos; requests to access, correct,
              or delete their data.
            </li>
            <li>
              Using the data only for the purposes you disclosed to
              your leads.
            </li>
          </ul>
          <p>
            If a lead contacts us directly to exercise their rights, we
            will forward the request to you and assist as required by
            the DPA.
          </p>

          <H2>8. Security</H2>
          <p>
            We rely on Firebase&apos;s industry-standard encryption in
            transit (TLS) and at rest (AES-256). Access to production
            data is restricted to authorised admins only and is logged.
            No method of transmission over the internet is 100% secure,
            but we follow accepted practices to keep your data
            protected.
          </p>

          <H2>9. Children</H2>
          <p>
            Credibly is not intended for individuals under 18. We do not
            knowingly collect personal data from minors. If you believe
            a child has signed up, contact us at{" "}
            <a href="mailto:privacy@crediblyai.com">
              privacy@crediblyai.com
            </a>{" "}
            and we will delete the account.
          </p>

          <H2>10. Changes to this policy</H2>
          <p>
            If we change this policy in a material way, we will email
            you (if you opted into product updates) and require fresh
            consent on your next signin. Otherwise, minor updates will
            be reflected here with the &ldquo;Last updated&rdquo; date
            at the top of the page.
          </p>

          <H2>11. Contact</H2>
          <p>
            Data Protection Officer:{" "}
            <a href="mailto:privacy@crediblyai.com">
              privacy@crediblyai.com
            </a>
            <br />
            General inquiries:{" "}
            <a href="mailto:support@crediblyai.com">
              support@crediblyai.com
            </a>
          </p>

          <hr className="my-8 border-white/[0.06]" />
          <p className="text-xs text-white/40">
            See also our{" "}
            <Link href="/terms">Terms of Service</Link>.
          </p>
        </Prose>
      </main>
    </div>
  );
}

/* ── Lightweight typography wrapper ─────────────────────────────── */

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
