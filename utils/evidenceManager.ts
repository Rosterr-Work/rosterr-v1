import fs from "fs";
import path from "path";
import { fileTypeFromBuffer } from "file-type";

// Moderation evidence files on disk, one folder per case: pictures and videos only, checked by what is inside them (not by their name).

const ROOT = path.join(process.cwd(), "evidence");
const MAX_BYTES = 25 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };

export interface EvidenceUploadResult { fileUrl: string; fileName: string; fileType: string; fileSize: number }

/** A folder or file name that can't point anywhere else: letters, numbers, dots, dashes and underscores, and not "." or "..". */
export const isSafeSegment = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9._-]{1,200}$/.test(s) && s !== "." && s !== "..";

const caseDir = (caseId: string) => path.join(ROOT, caseId);

export async function validateFileBuffer(buffer: Buffer): Promise<{ valid: boolean; fileType?: string; error?: string }> {
  if (buffer.length > MAX_BYTES) return { valid: false, error: `File size exceeds maximum allowed size of ${MAX_BYTES / 1024 / 1024}MB` };
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !(detected.mime in TYPES)) return { valid: false, error: `File type not allowed. Allowed types: ${Object.keys(TYPES).join(", ")}` };
  return { valid: true, fileType: detected.mime };
}

export async function saveEvidenceFile(caseId: string, fileName: string, buffer: Buffer): Promise<EvidenceUploadResult> {
  if (!isSafeSegment(caseId)) throw new Error("Invalid case");
  const checked = await validateFileBuffer(buffer);
  if (!checked.valid) throw new Error(checked.error);
  const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "file";
  const stored = `${Date.now()}-${clean}`;
  fs.mkdirSync(caseDir(caseId), { recursive: true });
  fs.writeFileSync(path.join(caseDir(caseId), stored), buffer);
  return { fileUrl: `/api/evidence/${caseId}/${stored}`, fileName: clean, fileType: checked.fileType!, fileSize: buffer.length };
}

/** Removes one saved file given the address it was saved under. */
export function deleteEvidenceFile(fileUrl: string): boolean {
  try {
    const [caseId, name] = fileUrl.split("/").slice(-2);
    if (!isSafeSegment(caseId) || !isSafeSegment(name)) return false;
    const file = path.join(caseDir(caseId), name);
    if (!fs.existsSync(file)) return false;
    fs.unlinkSync(file);
    return true;
  } catch (error) {
    console.error("[evidence] could not delete file:", error);
    return false;
  }
}

export function deleteCaseEvidence(caseId: string): boolean {
  try {
    if (!isSafeSegment(caseId) || !fs.existsSync(caseDir(caseId))) return false;
    fs.rmSync(caseDir(caseId), { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("[evidence] could not delete case folder:", error);
    return false;
  }
}

export const getExtensionFromMimeType = (mime: string) => TYPES[mime] || "bin";

/** Where a saved file is on disk, or null when it isn't there (or the names aren't plain names). */
export function getEvidenceFilePath(caseId: string, fileName: string): string | null {
  if (!isSafeSegment(caseId) || !isSafeSegment(fileName)) return null;
  const file = path.join(caseDir(caseId), fileName);
  return fs.existsSync(file) ? file : null;
}

/** The bytes in a "data:...;base64,xxxx" string (or plain base64). */
export function parseBase64File(data: string): Buffer {
  return Buffer.from(data.includes(",") ? data.split(",")[1] : data, "base64");
}
