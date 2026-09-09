export type UnmessItem = {
  action: string;
  when: string;
  priority: "high" | "medium" | "low";
  note?: string | undefined;
  effort?: "quick" | "focused" | undefined;
  blockedBy?: string | undefined;
};


import { logSystemError } from "./monitor.server";

export async function callUnmessAI(text: string): Promise<UnmessItem[]> {
  try {
    return await requestUnmessPlan(text);
  } catch (error) {
    await logSystemError("unmess_ai", error, { textLength: text.length });
    throw error;
  }
}

async function requestUnmessPlan(text: string): Promise<UnmessItem[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a calm, practical planning assistant. You turn messy, unstructured brain-dump text about someone's life (tasks, deadlines, errands, reminders) into a clean, genuinely useful plan — not just a categorised list. " +
            "For each item return: action (short, clear, imperative), when (an inferred date or timeframe as a short human-readable string, e.g. 'Fri Aug 28' or 'this weekend'; use 'no date' if none is mentioned or implied), " +
            "priority ('high' for urgent or imminent deadlines, 'medium' for time-bound but not urgent, 'low' for everything else), " +
            "and optionally note: ONE short line (max ~15 words) giving a concrete next step or genuinely useful context — e.g. for 'Finish Python assignment', a note like 'Start with the CSV-reading function; check the rubric for what's still required'. " +
            "Only include a note when there is a real, specific starting point or useful detail. Omit it entirely for simple items like 'buy milk'. Never write generic filler such as 'get started on this' or 'make a plan'. " +
            "Also infer effort: 'quick' when the task realistically takes under about 15 minutes (a phone call, a short reply, booking something online), 'focused' when it needs real concentration or a longer stretch (writing a report, revising, preparing a presentation). " +
            "Also infer blocked_by: if the text implies one item can only happen after another item in this same plan is done (e.g. packing for a trip after booking the flight), set blocked_by to the exact action string of the item it depends on. Leave blocked_by out entirely when no dependency is implied. Never make an item depend on itself. " +
            "When the input is vague, shorthand, or ambiguous, do NOT fall back to a generic catch-all item: make the most reasonable interpretation and state that assumption plainly in the note (e.g. 'Assuming this is the maths test on Thursday'). " +
            "Expand abbreviations and shorthand sensibly. Infer dates relative to today's date: " +
            new Date().toDateString() +
            ". Write in British/International English.",
        },
        { role: "user", content: text },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "unmess_plan",
            description: "Return the organised plan extracted from the user's text.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      when: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      note: {
                        type: "string",
                        description:
                          "Optional one-line concrete next step, useful context, or stated assumption. Leave out when it would be generic filler.",
                      },
                    },
                    required: ["action", "when", "priority"],
                    additionalProperties: false,
                  },
                },
              },

              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "unmess_plan" } },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("The AI did not return a plan");

  const parsed = JSON.parse(args) as { items: UnmessItem[] };
  return parsed.items.map((item) => {
    const note = item.note?.trim();
    return { ...item, note: note && note.length > 1 ? note : undefined };
  });

}
