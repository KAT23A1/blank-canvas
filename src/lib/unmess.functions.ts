import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type UnmessItem = {
  action: string;
  when: string;
  priority: "high" | "medium" | "low";
};

export const unmessText = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ text: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<UnmessItem[]> => {
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
              "You turn messy, unstructured brain-dump text about someone's life (tasks, deadlines, errands, reminders) into a clean list of actionable items. " +
              "For each item return: action (short, clear, imperative), when (an inferred date or timeframe as a short human-readable string, e.g. 'Fri Aug 28' or 'this weekend'; use 'no date' if none is mentioned or implied), " +
              "and priority: 'high' for urgent or imminent deadlines, 'medium' for time-bound but not urgent, 'low' for everything else. Infer dates relative to today's date: " +
              new Date().toDateString() +
              ".",
          },
          { role: "user", content: data.text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "unmess_plan",
              description: "Return the organized plan extracted from the user's text.",
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
    return parsed.items;
  });
