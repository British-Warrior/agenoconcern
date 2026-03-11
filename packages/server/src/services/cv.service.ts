import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

const MAX_TEXT_LENGTH = 8000;

/**
 * Extract text from a CV buffer based on MIME type.
 * Supports PDF, DOCX, and plain text.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  let text: string;

  if (mimeType === "application/pdf") {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF extraction timed out after 15 seconds")), 15000),
    );
    const parse = (async () => {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    })();
    text = await Promise.race([parse, timeout]);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (mimeType === "text/plain") {
    text = buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
  }

  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

/**
 * Extract text from an image using OCR.
 */
export async function ocrImage(buffer: Buffer): Promise<string> {
  const { data } = await Tesseract.recognize(buffer, "eng");
  return data.text.trim().slice(0, MAX_TEXT_LENGTH);
}
