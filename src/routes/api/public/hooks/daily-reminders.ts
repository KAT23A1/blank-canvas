import { createFileRoute } from "@tanstack/react-router";
import { parseWhen } from "@/lib/dates";

type DueKind = "morning_of" | "day_before";

type CandidateItem = {
  id: string;
  action: string;
  when: string;
  priority: "high" | "medium" | "low";
  userId: string;
  kind: DueKind;
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const priorityDot: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#a8a29e",
};

function itemRow(item: CandidateItem): string {
  const dot = priorityDot[item.priority] ?? priorityDot["low"];
  const when =
    item.when && item.when.toLowerCase() !== "no date"
      ? `<span style="color:#78716c;font-size:13px;"> — ${escapeHtml(item.when)}</span>`
      : "";
  return `<li style="margin:0 0 10px 0;font-size:15px;color:#1c1917;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${dot};margin-right:8px;"></span>${escapeHtml(item.action)}${when}
  </li>`;
}

function buildEmailHtml(todayItems: CandidateItem[], tomorrowItems: CandidateItem[]): string {
  const sections: string[] = [];
  if (todayItems.length > 0) {
    sections.push(`
      <p style="margin:24px 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;">Due today</p>
      <ul style="margin:0;padding:0 0 0 4px;list-style:none;">${todayItems.map(itemRow).join("")}</ul>`);
  }
  if (tomorrowItems.length > 0) {
    sections.push(`
      <p style="margin:24px 0 12px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;">Due tomorrow</p>
      <ul style="margin:0;padding:0 0 0 4px;list-style:none;">${tomorrowItems.map(itemRow).join("")}</ul>`);
  }
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#1c1917;">UNMESS</p>
    <div style="background:#ffffff;border:1px solid #e7e5e0;border-radius:16px;padding:28px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#1c1917;">Here's what needs you today</h1>
      ${sections.join("")}
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;">You're receiving this because you're an UNMESS Pro member with dated action items.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailText(todayItems: CandidateItem[], tomorrowItems: CandidateItem[]): string {
  const lines: string[] = ["UNMESS — here's what needs you.", ""];
  if (todayItems.length > 0) {
    lines.push("Due today:");
    for (const i of todayItems) lines.push(`  - ${i.action}${i.when ? ` (${i.when})` : ""}`);
    lines.push("");
  }
  if (tomorrowItems.length > 0) {
    lines.push("Due tomorrow:");
    for (const i of tomorrowItems) lines.push(`  - ${i.action}${i.when ? ` (${i.when})` : ""}`);
    lines.push("");
  }
  lines.push("You're receiving this because you're an UNMESS Pro member with dated action items.");
  return lines.join("\n");
}

async function sendReminderEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  const gmailUser = process.env["GMAIL_USER"];
  const gmailPass = process.env["GMAIL_APP_PASSWORD"]?.replace(/\s+/g, "");

  // Preferred: Gmail SMTP (smtp.gmail.com:465 SSL), sender "UNMESS <you@gmail.com>".
  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transport.sendMail({
        from: `UNMESS <${gmailUser}>`,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (err) {
      console.error("gmail smtp error", err);
      return false;
    }
  }

  // Fallback: managed email delivery (needs a verified sender domain).
  const apiKey = process.env["LOVABLE_API_KEY"];
  const senderDomain = process.env["UNMESS_SENDER_DOMAIN"];
  if (!apiKey || !senderDomain) {
    console.error(
      "reminder email skipped: set GMAIL_USER/GMAIL_APP_PASSWORD, or configure a sender domain",
    );
    return false;
  }
  try {
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    const result = await sendLovableEmail(
      {
        to,
        from: `UNMESS <reminders@${senderDomain}>`,
        subject,
        html,
        text,
        purpose: "transactional",
      },
      { apiKey },
    );
    if (!result.success) {
      console.error("managed email failed", result);
      return false;
    }
    return true;
  } catch (err) {
    console.error("managed email error", err);
    return false;
  }
}

export const Route = createFileRoute("/api/public/hooks/daily-reminders")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!apikey || !expected || apikey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Pro users only — reminders are a Pro feature.
        const { data: proSubs, error: subsError } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("plan", "pro");
        if (subsError) return json({ error: subsError.message }, 500);

        const proIds = (proSubs ?? []).map((s) => s.user_id as string);
        if (proIds.length === 0) return json({ usersEmailed: 0, remindersSent: 0 });

        const { data: rawItems, error: itemsError } = await supabaseAdmin
          .from("plan_items")
          .select("id, action, when_text, priority, plans!inner(user_id)")
          .eq("done", false)
          .in("plans.user_id", proIds);
        if (itemsError) return json({ error: itemsError.message }, 500);

        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);

        const candidates: CandidateItem[] = [];
        for (const row of rawItems ?? []) {
          const when = (row.when_text ?? "") as string;
          if (!when) continue;
          const date = parseWhen(when);
          if (!date) continue;
          const kind: DueKind | null =
            date.getTime() === today.getTime()
              ? "morning_of"
              : date.getTime() === tomorrow.getTime()
                ? "day_before"
                : null;
          if (!kind) continue;
          candidates.push({
            id: row.id as string,
            action: row.action as string,
            when,
            priority: row.priority as CandidateItem["priority"],
            userId: (row.plans as unknown as { user_id: string }).user_id,
            kind,
          });
        }

        if (candidates.length === 0) return json({ usersEmailed: 0, remindersSent: 0 });

        // Dedupe: never send the same reminder for the same item twice.
        const { data: alreadySent } = await supabaseAdmin
          .from("reminder_sends")
          .select("item_id, kind")
          .in("item_id", candidates.map((c) => c.id));
        const sentSet = new Set(
          (alreadySent ?? []).map((r) => `${r.item_id as string}:${r.kind as string}`),
        );

        const fresh = candidates.filter((c) => !sentSet.has(`${c.id}:${c.kind}`));
        if (fresh.length === 0) return json({ usersEmailed: 0, remindersSent: 0 });

        const { data: usersData, error: usersError } =
          await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (usersError) return json({ error: usersError.message }, 500);
        const emailById = new Map(usersData.users.map((u) => [u.id, u.email ?? ""]));

        const byUser = new Map<string, CandidateItem[]>();
        for (const item of fresh) {
          const list = byUser.get(item.userId) ?? [];
          list.push(item);
          byUser.set(item.userId, list);
        }

        let usersEmailed = 0;
        let remindersSent = 0;

        for (const [userId, items] of byUser) {
          const email = emailById.get(userId);
          if (!email) continue;

          const todayItems = items.filter((i) => i.kind === "morning_of");
          const tomorrowItems = items.filter((i) => i.kind === "day_before");
          const subject =
            todayItems.length > 0
              ? "UNMESS — here's what needs you today"
              : "UNMESS — coming up tomorrow";

          const sent = await sendReminderEmail(
            email,
            subject,
            buildEmailHtml(todayItems, tomorrowItems),
            buildEmailText(todayItems, tomorrowItems),
          );
          if (!sent) continue;

          usersEmailed += 1;
          const { error: logError } = await supabaseAdmin.from("reminder_sends").insert(
            items.map((i) => ({ item_id: i.id, user_id: userId, kind: i.kind })),
          );
          if (!logError) remindersSent += items.length;
        }

        return json({ usersEmailed, remindersSent, timestamp: new Date().toISOString() });
      },
    },
  },
});
