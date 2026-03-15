import { useEffect } from "react";
import { Link } from "react-router";
import { ROUTES } from "../lib/constants.js";
import { openCookieSettings } from "../components/ui/ConsentBanner.js";
import { Button } from "../components/ui/Button.js";

export function CookiePolicy() {
  useEffect(() => {
    document.title = "Cookie Policy — Indomitable Unity";
  }, []);

  return (
    <article className="prose max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Cookie Policy
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        Version 1.0 &mdash; Last updated: March 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          What are cookies?
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          Cookies are small text files stored on your device when you visit a
          website. They help the site remember your preferences and keep you
          logged in.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Essential cookies
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-3">
          These cookies are strictly necessary for the platform to function.
          They do not require your consent.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-base text-neutral-700 border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-200">
                <th className="text-left py-2 pr-4 font-semibold">Cookie</th>
                <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                <th className="text-left py-2 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-100">
                <td className="py-2 pr-4">access_token</td>
                <td className="py-2 pr-4">
                  Authenticates your session (httpOnly, not accessible to
                  JavaScript)
                </td>
                <td className="py-2">15 minutes</td>
              </tr>
              <tr className="border-b border-neutral-100">
                <td className="py-2 pr-4">refresh_token</td>
                <td className="py-2 pr-4">
                  Refreshes your session without re-login (httpOnly)
                </td>
                <td className="py-2">7 days</td>
              </tr>
              <tr className="border-b border-neutral-100">
                <td className="py-2 pr-4">anc_cookie_consent</td>
                <td className="py-2 pr-4">
                  Remembers your cookie preferences (localStorage)
                </td>
                <td className="py-2">Persistent</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Analytics cookies
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-3">
          These cookies help us understand how the site is used. They are{" "}
          <strong>off by default</strong> and only set if you give explicit
          consent. You can withdraw consent at any time.
        </p>
        <p className="text-base text-neutral-700 leading-relaxed">
          We currently do not use any third-party analytics services. If we add
          analytics in the future, this policy will be updated and your consent
          will be requested.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          Managing your cookies
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed mb-4">
          You can manage your cookie preferences at any time using the button
          below, or via the &ldquo;Manage Cookies&rdquo; link in the page
          footer.
        </p>
        <Button variant="outline" onClick={openCookieSettings}>
          Manage Cookie Preferences
        </Button>
        <p className="text-base text-neutral-700 leading-relaxed mt-4">
          You can also clear cookies through your browser settings. Note that
          clearing essential cookies will log you out.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-3">
          More information
        </h2>
        <p className="text-base text-neutral-700 leading-relaxed">
          For more about how we handle your data, see our{" "}
          <Link
            to={ROUTES.PRIVACY}
            className="text-primary-800 underline"
          >
            Privacy Policy
          </Link>
          . If you have questions about cookies, contact us at{" "}
          <a
            href="mailto:kirk@indomitableunity.org"
            className="text-primary-800 underline"
          >
            kirk@indomitableunity.org
          </a>
          .
        </p>
      </section>
    </article>
  );
}
