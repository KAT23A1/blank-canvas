import { unzipSync, strFromU8 } from "fflate";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type ExtractKind = "text" | "docx" | "pdf" | "image";

export function classifyFile(name: string, mimeType: string): ExtractKind | null {
  const lower = name.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "docx";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    /\.(txt|md|csv|json|log)$/.test(lower)
  )
    return "text";
  return null;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function docxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("This .docx file looks empty or corrupted.");
  const xml = strFromU8(doc);
  return xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const OCR_PROMPT =
  "Transcribe every piece of text in this file, in reading order. Keep line breaks, dates, times and numbers exactly as written. " +
  "Return only the transcribed text with no commentary. If there is no readable text, return exactly: NO_TEXT_FOUND";

async function transcribeWithAI(
  block: Record<string, unknown>,
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("File reading is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "user", content: [{ type: "text", text: OCR_PROMPT }, block] },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Could not read that file (${res.status}): ${body.slice(0, 160)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = (json.choices?.[0]?.message?.content ?? "").trim();
  if (!text || text === "NO_TEXT_FOUND") {
    throw new Error("We couldn't find any readable text in that file.");
  }
  return text;
}

export async function extractFileText(input: {
  name: string;
  mimeType: string;
  base64: string;
}): Promise<string> {
  const kind = classifyFile(input.name, input.mimeType);
  if (!kind) {
    throw new Error("That file type isn't supported. Try an image, PDF, .txt or .docx.");
  }

  const bytes = base64ToBytes(input.base64);
  if (bytes.byteLength === 0) throw new Error("That file appears to be empty.");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("That file is too large — please keep it under 8MB.");
  }

  if (kind === "text") {
    const text = new TextDecoder().decode(bytes).trim();
    if (!text) throw new Error("We couldn't find any readable text in that file.");
    return text;
  }

  if (kind === "docx") {
    const text = docxToText(bytes);
    if (!text) throw new Error("We couldn't find any readable text in that file.");
    return text;
  }

  if (kind === "image") {
    const mime = input.mimeType.startsWith("image/") ? input.mimeType : "image/png";
    return transcribeWithAI({
      type: "image_url",
      image_url: { url: `data:${mime};base64,${input.base64}` },
    });
  }

  return transcribeWithAI({
    type: "file",
    file: {
      filename: input.name,
      file_data: `data:application/pdf;base64,${input.base64}`,
    },
  });
}
