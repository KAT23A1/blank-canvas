import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — UNMESS" },
      {
        name: "description",
        content: "The terms that govern your use of UNMESS.",
      },
      { property: "og:title", content: "Terms of Service — UNMESS" },
      {
        property: "og:description",
        content: "The terms that govern your use of UNMESS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-16 sm:px-8">
      <header className="flex w-full max-w-2xl items-center justify-between py-5">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          UNMESS
        </Link>
        <Link
          to="/auth"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <article className="w-full max-w-2xl">
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 2026</p>

        <Section title="The service">
          <p>
            UNMESS turns unstructured text you provide into an organised, prioritised
            plan using AI. The output is a best-effort interpretation of your input — you
            are responsible for reviewing it before acting on it.
          </p>
        </Section>

        <Section title="Accounts">
          <p>
            You must provide a valid email address to create an account. You're
            responsible for keeping your credentials secure and for activity under your
            account. Unauthenticated visitors may try the service once; continued use and
            saving plans require an account.
          </p>
        </Section>

        <Section title="Plans and billing">
          <p>
            The Free plan includes 5 unmesses per calendar month, resetting on the first
            of each month. UNMESS Pro is a monthly subscription billed through Lemon
            Squeezy and includes unlimited unmesses and email reminders. You can cancel
            anytime; your plan stays Pro until the end of the paid period, then returns
            to Free. Payments are non-refundable except where required by law.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Don't use UNMESS for anything unlawful, to process other people's personal
            data without a legal basis, or to abuse, overload, or reverse-engineer the
            service. We may suspend accounts that violate these terms.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            You retain ownership of everything you paste into UNMESS. You grant us a
            limited licence to process and store it solely to provide the service to you.
          </p>
        </Section>

        <Section title="Disclaimers and liability">
          <p>
            UNMESS is provided "as is" without warranties of any kind. AI-generated plans
            may be incomplete or inaccurate. To the maximum extent permitted by law, we
            are not liable for indirect or consequential damages, and our total liability
            is limited to the amount you paid us in the 12 months before the claim.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms as the service evolves. Material changes will be
            announced in the app before they take effect. Continued use after that
            constitutes acceptance.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Email us at{" "}
            <a
              href="mailto:icecomparison230@gmail.com"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              icecomparison230@gmail.com
            </a>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}
