import { useEffect } from "react";
import { Link } from "react-router";
import { ROUTES } from "../lib/constants.js";

export function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy — Indomitable Unity";
  }, []);

  return (
    <article className="prose max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        Version 1.0 &mdash; Last updated: March 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Who we are
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-3">
          Indomitable Unity is a platform that connects experienced professionals
          with communities and organisations that value their expertise. We are
          the data controller for the personal data described in this policy.
        </p>
        <p className="text-base text-neutral-700 leading-relaxed">
          <strong>Contact:</strong> Kirk Harper &mdash;{" "}
          <a
            href="mailto:kirk@indomitableunity.org"
            className="text-primary-800 underline"
          >
            kirk@indomitableunity.org
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          What data we collect
        </h2>
        <ul className="list-disc pl-6 text-base text-neutral-700 leading-relaxed space-y-2">
          <li>
            <strong>Account information:</strong> Name, email address, phone
            number (if you choose phone login)
          </li>
          <li>
            <strong>OAuth profile data:</strong> If you sign in with Google or
            LinkedIn, we receive your name, email, and profile picture from
            those services
          </li>
          <li>
            <strong>Authentication data:</strong> Hashed passwords (we never
            store your actual password), session tokens
          </li>
          <li>
            <strong>Usage data:</strong> Pages visited, actions taken within the
            platform (only if you consent to analytics cookies)
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Why we collect it
        </h2>
        <ul className="list-disc pl-6 text-base text-neutral-700 leading-relaxed space-y-2">
          <li>
            <strong>Legitimate interest:</strong> To match you with relevant
            challenges and communities based on your skills and experience
          </li>
          <li>
            <strong>Contract performance:</strong> To provide the platform
            services you signed up for
          </li>
          <li>
            <strong>Consent:</strong> For optional analytics cookies (you can
            withdraw consent at any time via{" "}
            <Link
              to={ROUTES.COOKIES}
              className="text-primary-800 underline"
            >
              Cookie Settings
            </Link>
            )
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          How long we keep it
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          We retain your personal data for the duration of your active account.
          If you request account deletion, we will remove your data within 30
          days, except where we are legally required to retain records (e.g.,
          financial transactions), which are kept for 2 years after deletion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Your rights
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-3">
          Under the UK GDPR, you have the right to:
        </p>
        <ul className="list-disc pl-6 text-base text-neutral-700 leading-relaxed space-y-2">
          <li>
            <strong>Access</strong> your personal data (Subject Access Request)
          </li>
          <li>
            <strong>Rectification</strong> &mdash; correct inaccurate data
          </li>
          <li>
            <strong>Erasure</strong> &mdash; request deletion of your data
          </li>
          <li>
            <strong>Portability</strong> &mdash; receive your data in a
            machine-readable format
          </li>
          <li>
            <strong>Object</strong> to processing based on legitimate interests
          </li>
          <li>
            <strong>Withdraw consent</strong> at any time for consent-based
            processing
          </li>
        </ul>
      </section>

      <section className="mb-8 p-4 bg-info-bg border border-info rounded-[var(--radius-md)]">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Interim notice: Data export and deletion
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-3">
          We are building automated self-service tools for data export (Subject
          Access Request) and account deletion (Right to Erasure). These
          features will be available in a future update.
        </p>
        <p className="text-base text-neutral-700 leading-relaxed">
          In the meantime, you can exercise any of these rights by emailing{" "}
          <a
            href="mailto:kirk@indomitableunity.org"
            className="text-primary-800 underline font-medium"
          >
            kirk@indomitableunity.org
          </a>
          . We will respond within 30 days as required by law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Cookies
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          For full details on how we use cookies, see our{" "}
          <Link
            to={ROUTES.COOKIES}
            className="text-primary-800 underline"
          >
            Cookie Policy
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Changes to this policy
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          We will notify you of significant changes to this policy via email or
          a notice on the platform. Minor changes will be reflected in the
          &ldquo;last updated&rdquo; date above.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Complaints
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          If you believe we have not handled your data correctly, you have the
          right to lodge a complaint with the Information Commissioner&rsquo;s
          Office (ICO) at{" "}
          <a
            href="https://ico.org.uk"
            className="text-primary-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ico.org.uk
          </a>
          .
        </p>
      </section>
    </article>
  );
}
