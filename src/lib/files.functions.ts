import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractFileText } from "./extract.server";

export const extractFile = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1),
        mimeType: z.string(),
        base64: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ text: string; error?: string }> => {
    try {
      return { text: await extractFileText(data) };
    } catch (error) {
      return {
        text: "",
        error:
          error instanceof Error && error.message
            ? error.message.replace(/^Error:\s*/, "")
            : "We couldn't read that file. Try another one.",
      };
    }
  });
