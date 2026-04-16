import mammoth from "mammoth";

export interface ParsedFile {
  text: string;
  candidateName: string | null;
}

function guessCandidateName(text: string): string | null {
  // First non-empty line, trimmed to something name-ish
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && l.length < 80);
  if (!firstLine) return null;
  // Reject obvious non-names
  if (/\d/.test(firstLine) || /@/.test(firstLine)) return null;
  if (firstLine.split(" ").length > 6) return null;
  return firstLine;
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // Lazy import so Next.js doesn't try to bundle it for the client
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function parseFile(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  let text: string;
  if (lower.endsWith(".pdf")) {
    text = await parsePdf(buffer);
  } else if (lower.endsWith(".docx")) {
    text = await parseDocx(buffer);
  } else if (lower.endsWith(".txt")) {
    text = buffer.toString("utf8");
  } else {
    throw new Error(`Unsupported file type: ${fileName}`);
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length < 50) {
    throw new Error(
      "Parsed file is too short — the file may be an image-only PDF or corrupt.",
    );
  }

  return { text, candidateName: guessCandidateName(text) };
}
