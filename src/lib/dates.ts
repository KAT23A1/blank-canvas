// Best-effort parsing of free-text timeframes ("today", "Friday", "next week")
// into concrete dates for the Today dashboard.

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns a Date when the timeframe text implies one, otherwise null. */
export function parseWhen(when: string): Date | null {
  const text = when.trim().toLowerCase();
  if (!text || text === "no date" || text === "someday" || text === "no deadline") {
    return null;
  }

  const today = startOfDay(new Date());

  if (/\b(asap|urgent|immediately|right away|now)\b/.test(text)) return today;
  if (/\btoday\b/.test(text)) return today;
  if (/\btonight\b/.test(text)) return today;
  if (/\btomorrow\b/.test(text)) return addDays(today, 1);
  if (/\bnext week\b/.test(text)) return addDays(today, 7);

  const inDays = text.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) return addDays(today, Number(inDays[1]));

  const inWeeks = text.match(/\bin\s+(\d+)\s+weeks?\b/);
  if (inWeeks) return addDays(today, Number(inWeeks[1]) * 7);

  // Weekday names → next occurrence of that weekday
  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(text)) {
      const delta = (i - today.getDay() + 7) % 7 || 7;
      return addDays(today, delta);
    }
  }

  // Fall back to native parsing for strings like "Aug 30" or "2026-09-01".
  // If extra words ("by noon", "evening") break parsing, trim trailing words and retry.
  let candidate = when.trim();
  while (candidate) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) return startOfDay(new Date(parsed));
    const trimmed = candidate.replace(/\s+\S+$/, "");
    if (trimmed === candidate) break;
    candidate = trimmed;
  }

  return null;
}

export type Urgency = "overdue" | "today" | "upcoming" | "someday";

export function classifyWhen(when: string): { urgency: Urgency; date: Date | null } {
  const date = parseWhen(when);
  if (!date) return { urgency: "someday", date: null };
  const today = startOfDay(new Date());
  if (date.getTime() < today.getTime()) return { urgency: "overdue", date };
  if (date.getTime() === today.getTime()) return { urgency: "today", date };
  return { urgency: "upcoming", date };
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
