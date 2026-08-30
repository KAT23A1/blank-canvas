import { unzipSync, strFromU8 } from "fflate";
import { logSystemError } from "./monitor.server";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DOCX_IMAGES_TO_SCAN = 6;

export type ExtractKind = "text" | "docx" | "xlsx" | "pptx" | "pdf" | "image" | "unknown";

export function classifyFile(name: string, mimeType: string): ExtractKind {
  const lower = name.toLowerCase();
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic|heif|tiff?)$/.test(lower))
    return "image";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "docx";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lower.endsWith(".xlsx")
  )
    return "xlsx";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lower.endsWith(".pptx")
  )
    return "pptx";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    /\.(txt|md|csv|tsv|json|log|xml|yml|yaml|rtf|html?)$/.test(lower)
  )
    return "text";
  return "unknown";
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

function collectTagText(xml: string, tag: string): string[] {
  const matches = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g")) ?? [];
  return matches
    .map((chunk) => decodeXmlEntities(chunk.replace(/<[^>]+>/g, "")).trim())
    .filter(Boolean);
}

function xlsxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const shared = files["xl/sharedStrings.xml"]
    ? collectTagText(strFromU8(files["xl/sharedStrings.xml"]), "t")
    : [];

  const sheets = Object.entries(files)
    .filter(([path]) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort(([a], [b]) => a.localeCompare(b));

  const lines: string[] = [];
  for (const [, file] of sheets) {
    const xml = strFromU8(file);
    for (const row of xml.match(/<row[\s\S]*?<\/row>/g) ?? []) {
      const cells: string[] = [];
      for (const cell of row.match(/<c\b[\s\S]*?(?:\/>|<\/c>)/g) ?? []) {
        const isShared = /\bt="s"/.test(cell);
        const value = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const inline = collectTagText(cell, "t");
        if (isShared && value !== undefined) {
          cells.push(shared[Number(value)] ?? "");
        } else if (value !== undefined) {
          cells.push(decodeXmlEntities(value));
        } else if (inline.length) {
          cells.push(inline.join(" "));
        }
      }
      const line = cells.filter(Boolean).join(" | ").trim();
      if (line) lines.push(line);
    }
  }

  return lines.join("\n").trim();
}

function pptxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const slides = Object.entries(files)
    .filter(([path]) => /^ppt\/(slides|notesSlides)\/[a-z]+\d+\.xml$/i.test(path))
    .sort(([a], [b]) => a.localeCompare(b));

  return slides
    .map(([, file]) => collectTagText(strFromU8(file), "a:t").join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function looksLikeText(bytes: Uint8Array): string | null {
  const sample = bytes.subarray(0, 4096);
  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return null;
    if (byte < 9 || (byte > 13 && byte < 32)) control++;
  }
  if (control / Math.max(sample.length, 1) > 0.05) return null;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
  return text.replace(/\uFFFD/g, "").trim().length > 20 ? text : null;
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

  const bytes = base64ToBytes(input.base64);
  if (bytes.byteLength === 0) throw new Error("That file appears to be empty or corrupted.");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("That file is too large — please keep it under 25MB.");
  }

  const fallback = `[Attached file: ${input.name}${
    input.mimeType ? ` (${input.mimeType})` : ""
  }] — its contents couldn't be read automatically. Treat the filename as context.`;

  if (kind === "text") {
    const text = new TextDecoder().decode(bytes).trim();
    return text || fallback;
  }

  if (kind === "docx") {
    try {
      const text = await docxToText(bytes);
      if (text) return text;
    } catch {
      /* fall through to filename context */
    }
    return fallback;
  }

  if (kind === "xlsx" || kind === "pptx") {
    try {
      const text = kind === "xlsx" ? xlsxToText(bytes) : pptxToText(bytes);
      if (text) return text;
    } catch {
      /* fall through to filename context */
    }
    return fallback;
  }

  if (kind === "unknown") {
    const text = looksLikeText(bytes);
    return text ?? fallback;
  }

  if (kind === "image") {
    const mime = input.mimeType.startsWith("image/") ? input.mimeType : "image/png";
    try {
      return await transcribeWithAI({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${input.base64}` },
      });
    } catch (error) {
      if (error instanceof NoReadableTextError) return fallback;
      throw error;
    }
  }

  try {
    return await transcribeWithAI({
      type: "file",
      file: {
        filename: input.name,
        file_data: `data:application/pdf;base64,${input.base64}`,
      },
    });
  } catch (error) {
    if (error instanceof NoReadableTextError) return fallback;
    throw error;
  }
}
