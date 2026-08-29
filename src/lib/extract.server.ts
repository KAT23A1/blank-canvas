import { unzipSync, strFromU8 } from "fflate";
import { logSystemError } from "./monitor.server";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DOCX_IMAGES_TO_SCAN = 6;

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

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&#([0-9]+);/g, (_, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : "";
    });
}

function xmlPartToText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:cr[^>]*\/>/g, "\n")
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getImageMimeType(path: string): string | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return null;
}

async function docxToText(bytes: Uint8Array): Promise<string> {
  const files = unzipSync(bytes);
  if (!files["word/document.xml"]) {
    throw new Error("This .docx file looks empty or corrupted.");
  }

  const textParts = Object.entries(files)
    .filter(([path]) => /^word\/(document|footnotes|endnotes|comments|header\d+|footer\d+)\.xml$/i.test(path))
    .map(([, file]) => xmlPartToText(strFromU8(file)))
    .filter(Boolean);

  const imageParts = Object.entries(files)
    .map(([path, file]) => ({ path, file, mimeType: getImageMimeType(path) }))
    .filter((part) => Boolean(part.mimeType && part.path.startsWith("word/media/")))
    .map((part) => ({ path: part.path, file: part.file, mimeType: part.mimeType ?? "image/png" }))
    .slice(0, MAX_DOCX_IMAGES_TO_SCAN);

  if (textParts.length > 0 || imageParts.length === 0) {
    return textParts.join("\n\n").trim();
  }

  const scannedParts: string[] = [];
  for (const image of imageParts) {
    try {
      const text = await transcribeWithAI({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${bytesToBase64(image.file)}` },
      });
      scannedParts.push(text);
    } catch (error) {
      if (!(error instanceof NoReadableTextError)) throw error;
    }
  }

  return scannedParts.join("\n\n").trim();
}

const OCR_PROMPT =
  "Transcribe every piece of text in this file, in reading order. Keep line breaks, dates, times and numbers exactly as written. " +
  "Return only the transcribed text with no commentary. If there is no readable text, return exactly: NO_TEXT_FOUND";

class NoReadableTextError extends Error {
  constructor() {
    super("We couldn't find any readable text in that file.");
    this.name = "NoReadableTextError";
  }
}

function getGatewayMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: { message?: unknown } };
    const message = parsed.message ?? parsed.error?.message;
    return typeof message === "string" && message.trim() ? message.trim() : body.trim();
  } catch {
    return body.trim();
  }
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 4_000);
  }
  return Math.min(500 * 2 ** attempt, 2_000);
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function transcribeWithAI(block: Record<string, unknown>): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("File reading is not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "user", content: [{ type: "text", text: OCR_PROMPT }, block] },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const message = getGatewayMessage(body);
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < 2) {
        await wait(retryDelayMs(res, attempt));
        continue;
      }
      await logSystemError("file_extract_ai", message || `status ${res.status}`, {
        status: res.status,
      });
      throw new Error(
        message
          ? `Could not read that file (${res.status}): ${message}`
          : `Could not read that file (${res.status}).`,
      );
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!text || text === "NO_TEXT_FOUND") throw new NoReadableTextError();
    return text;
  }

  throw new Error("Could not read that file. Please try again.");
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
    const text = await docxToText(bytes);
    if (!text) {
      throw new Error(
        "We couldn't find readable text in that .docx. If it's a scan or screenshot, upload the image or PDF directly.",
      );
    }
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
