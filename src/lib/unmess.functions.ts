import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callUnmessAI, type UnmessItem } from "./unmess.server";

export type { UnmessItem };

// Guest path: one free unmess without an account (gated client-side).
// Signed-in users go through unmessTextAuthed, which enforces plan limits.
export const unmessText = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ text: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<UnmessItem[]> => callUnmessAI(data.text));
