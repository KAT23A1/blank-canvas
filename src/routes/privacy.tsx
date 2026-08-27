import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";


export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — UNMESS" },
      {
        name: "description",
        content: "How UNMESS collects, uses, and protects your data.",
      },
      { property: "og:title", content: "Privacy Policy — UNMESS" },
      {
        property: "og:description",
        content: "How UNMESS collects, uses, and protects your data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 pb-16 sm:px-8">
      <header className="flex w-full max-w-2xl items-center justify-between py-5">
        <Link to="/" className="bounce-button">
          <Logo className="h-10 sm:h-12" />
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 2026</p>

        <Section title="What we collect">
          <p>
            <strong className="text-foreground">Account data.</strong> When you sign up, we
            store your email address and authentication credentials (managed by our
            authentication provider).
          </p>
          <p>
            <strong className="text-foreground">Your content.</strong> The text you paste
            into UNMESS and the plans generated from it are stored so you can revisit,
            complete, and delete them.
          </p>
          <p>
            <strong className="text-foreground">Usage data.</strong> We track how many
            unmesses you've used in the current month to enforce plan limits.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            Your pasted text is sent to an AI model solely to extract and organise your
            action items. We use your email address to sign you in and, if you're a Pro
            member, to send reminder emails about your dated action items.
          </p>
          <p>We do not sell your data, show ads, or use your content to train AI models.</p>
        </Section>

        <Section title="Third-party services">
          <p>
            UNMESS relies on a small number of subprocessors to operate: cloud hosting and
            database (Lovable Cloud), AI processing (Lovable AI), payment processing
            (Lemon Squeezy, for Pro subscriptions), and email delivery (Gmail SMTP, for
            reminders). Each receives only the data needed to perform its function.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can delete individual plans and action items at any time. To delete your
            account and all associated data, contact us at{" "}
            <a
              href="mailto:icecomparison230@gmail.com"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              icecomparison230@gmail.com
            </a>{" "}
            and we'll remove everything within 30 days.
          </p>
        </Section>

        <Section title="Data retention & security">
          <p>
            Your data is stored with encryption in transit and at rest. We retain your
            content for as long as your account is active. Reminder emails are sent only
            to Pro members and only about items you created.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email us at{" "}
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
