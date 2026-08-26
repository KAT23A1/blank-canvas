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
  .handler(async ({ data }): Promise<{ text: string }> => ({
    text: await extractFileText(data),
  }));
