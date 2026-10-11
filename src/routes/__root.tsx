import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="glow inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="glow inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="glow inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UNMESS — AI Brain Dump & Planner" },
      { name: "description", content: "Paste the mess. Get the plan. UNMESS turns messy notes into a clear, prioritised to-do plan." },
      { name: "author", content: "UNMESS" },
      { property: "og:title", content: "UNMESS — AI Brain Dump & Planner" },
      { property: "og:description", content: "Paste the mess. Get the plan. UNMESS turns messy notes into a clear, prioritised to-do plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@unmess" },
      {
        name: "google-site-verification",
        content: "n4etcy7bXMgfuwsjh5pkTUNj9eesJRaqWHJSJvWiv5I",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 pb-8 pt-4 text-sm">
      <Link
        to="/pricing"
        className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Pricing
      </Link>
      <Link
        to="/privacy"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Privacy
      </Link>
      <Link
        to="/terms"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Terms
      </Link>
      <Link
        to="/adhd-brain-dump"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        ADHD brain dump
      </Link>
      <Link
        to="/adhd-planner"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        ADHD planner
      </Link>
      <Link
        to="/adhd-paralysis"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        ADHD paralysis
      </Link>
      <Link
        to="/settings"
        className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        Settings
      </Link>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <SiteFooter />
    </QueryClientProvider>
  );
}
