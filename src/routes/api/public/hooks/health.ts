import { createFileRoute } from "@tanstack/react-router";
import { runHealthChecks, sendHealthAlert, logSystemError } from "@/lib/monitor.server";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handle(request: Request): Promise<Response> {
  const apikey = request.headers.get("apikey");
  const expected =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!apikey || !expected || apikey !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await runHealthChecks();

    if (!result.ok) {
      const failing = result.checks.filter((c) => !c.ok);
      const body = failing
        .map((c) => `- ${c.name}: ${c.detail ?? "failed"}`)
        .join("\n");
      await sendHealthAlert(
        `UNMESS health check failed (${failing.length} issue${failing.length === 1 ? "" : "s"})`,
        `The automated UNMESS health check found problems:\n\n${body}\n\nRepaired subscriptions: ${result.repaired}\nErrors in last 24h: ${result.recentErrors}`,
      );
      await logSystemError("health_check", `failing: ${failing.map((c) => c.name).join(", ")}`, {
        checks: result.checks,
      });
    }

    return json(result, 200);
  } catch (err) {
    await logSystemError("health_check", err);
    return json({ ok: false, error: "health check crashed" }, 200);
  }
}

export const Route = createFileRoute("/api/public/hooks/health")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
