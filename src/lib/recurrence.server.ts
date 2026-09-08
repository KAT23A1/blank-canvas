import type { UnmessItem } from "./unmess.server";
import { logSystemError } from "./monitor.server";

export type OpenItem = {
  id: string;
  action: string;
  occurrence_count: number;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "to", "for", "of", "and", "my", "on", "in", "at", "it",
  "this", "that", "with", "do", "get", "need", "have", "is", "be", "up",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

/** Cheap word-overlap similarity used as the fallback matcher. */
function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

function fallbackMatch(items: UnmessItem[], open: OpenItem[]): (string | null)[] {
  const used = new Set<string>();
  return items.map((item) => {
    let best: { id: string; score: number } | null = null;
    for (const candidate of open) {
      if (used.has(candidate.id)) continue;
      const score = similarity(item.action, candidate.action);
      if (score >= 0.6 && (!best || score > best.score)) best = { id: candidate.id, score };
    }
    if (best) used.add(best.id);
    return best?.id ?? null;
  });
}

/**
 * One extra reasoning pass: decide which of the new items are really the same
 * thing as something the user already has open from a previous unmess.
 * Returns, per new item, the id of the matching open item (or null).
 */
export async function matchOpenItems(
  items: UnmessItem[],
  open: OpenItem[],
): Promise<(string | null)[]> {
  if (open.length === 0 || items.length === 0) return items.map(() => null);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallbackMatch(items, open);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You match new to-do items against a user's existing open items. Two items match when they refer to the same real-world task, even if worded very differently or with different levels of detail. Different tasks that merely share a topic do NOT match. Each existing item may be matched at most once. Return an index-aligned array for the new items: the existing item's id, or null when it is genuinely new.",
          },
          {
            role: "user",
            content: JSON.stringify({
              newItems: items.map((i, index) => ({ index, action: i.action })),
              existingOpenItems: open.map((o) => ({ id: o.id, action: o.action })),
            }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_matches",
              description: "Report which existing open item each new item matches.",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        existingId: { type: ["string", "null"] },
                      },
                      required: ["index", "existingId"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_matches" } },
      }),
    });

    if (!res.ok) return fallbackMatch(items, open);

    const json = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return fallbackMatch(items, open);

    const parsed = JSON.parse(args) as { matches?: { index: number; existingId: string | null }[] };
    const valid = new Set(open.map((o) => o.id));
    const used = new Set<string>();
    const result: (string | null)[] = items.map(() => null);
    for (const m of parsed.matches ?? []) {
      if (typeof m.index !== "number" || m.index < 0 || m.index >= items.length) continue;
      const id = m.existingId;
      if (!id || !valid.has(id) || used.has(id)) continue;
      used.add(id);
      result[m.index] = id;
    }
    return result;
  } catch (error) {
    await logSystemError("recurrence_match", error, { itemCount: items.length });
    return fallbackMatch(items, open);
  }
}

const BUMP: Record<"high" | "medium" | "low", "high" | "medium" | "low"> = {
  low: "medium",
  medium: "high",
  high: "high",
};

export function bumpPriority(p: "high" | "medium" | "low") {
  return BUMP[p];
}
