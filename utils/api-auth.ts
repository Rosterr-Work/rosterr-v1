import crypto from "crypto"
import prisma from "@/utils/database"
import { isWorkspaceSuspended } from "@/utils/platform/suspension"
import { currentApiCall } from "@/utils/apiContext"
import { isEngaged } from "@/utils/platform/switches"

const API_KEY_PREFIX = "rosterr_"

export function hashApiKey(plaintext: string) {
  return crypto.createHash("sha256").update(plaintext).digest("hex")
}

// Returns the plaintext (show once) plus the values that are safe to persist.
export function generateApiKey() {
  const plaintext = `${API_KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`
  return { plaintext, hash: hashApiKey(plaintext), hint: plaintext.slice(-4) }
}

// Validate API key for a given workspace
export async function validateApiKey(apiKey: string, workspaceId: string | number) {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) return null
  // Emergency stop (Platform > Switches): every key is refused while it is on.
  if (await isEngaged("api_keys")) return null

  const key = await prisma.apiCredential.findUnique({ where: { key: hashApiKey(apiKey) } })
  if (!key) return null

  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null

  const wanted = Number(workspaceId)
  if (!wanted || key.workspaceGroupId !== BigInt(wanted)) return null

  // A key stops working when the person who made it has left the workspace (or deleted their account), so a leaver cannot keep using what they made.
  let creator: unknown = undefined
  try {
    creator = await prisma.membership.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: key.workspaceGroupId, userId: key.createdById } }, select: { userId: true } })
  } catch {
    // If the membership can't be looked up, the key keeps working rather than every game losing its connection.
  }
  if (creator === null) return null

  // A suspended organisation's keys stop working (they are not deleted, so restoring re-enables them)
  if (await isWorkspaceSuspended(key.workspaceGroupId)) return null

  const call = currentApiCall()
  if (call) call.creatorId = key.createdById
  recordUse(key.id)

  return key
}

// A key in use is checked on every request, and a game server may send hundreds a minute. Writing "last used" each time was a database
// write per request, so it is written at most once a minute per key (the address and endpoint are those of that request).
const WRITE_EVERY_MS = 60_000;
const lastWrite = new Map<string, number>();

export function recordUse(keyId: string, now: number = Date.now()) {
  const before = lastWrite.get(keyId);
  if (before !== undefined && now - before < WRITE_EVERY_MS) return;
  lastWrite.set(keyId, now);
  if (lastWrite.size > 5000) for (const [k, t] of lastWrite) if (now - t > WRITE_EVERY_MS) lastWrite.delete(k);
  const call = currentApiCall();
  prisma.apiCredential
    .update({ where: { id: keyId }, data: { lastUsed: new Date(now), ...(call ? { lastUsedIp: call.ip, lastUsedPath: call.path } : {}) } })
    .catch(() => {});
}

/** For tests: forget what has been written. */
export const forgetKeyWrites = () => lastWrite.clear();
