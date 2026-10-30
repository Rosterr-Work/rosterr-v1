import prisma from "@/utils/database";

// A workspace's settings as key → JSON value (the `config` table), remembered in memory for a short while after being read. Writes go
// through setConfig, which keeps this server's memory in step at once. A change made by another server (the site can run on several) shows
// up here when the remembered value expires, rather than never: it used to be kept until a restart.

export const REMEMBER_MS = 30_000;
type Remembered = { value: any; at: number };
const remembered = new Map<string, Remembered>();
const slot = (groupId: bigint | number, key: string) => `${groupId}_${key}`;

export async function getConfig(key: string, groupId: bigint | number) {
  const at = slot(groupId, key);
  const hit = remembered.get(at);
  if (hit && Date.now() - hit.at < REMEMBER_MS) return hit.value;
  const row = await prisma.workspaceSetting.findFirst({ where: { workspaceGroupId: groupId, key } });
  if (!row) {
    remembered.delete(at);
    return null;
  }
  remembered.set(at, { value: row.value, at: Date.now() });
  return row.value;
}

export async function setConfig(key: string, value: any, groupId: bigint | number) {
  const row = await prisma.workspaceSetting.findFirst({ where: { workspaceGroupId: groupId, key } });
  if (row) await prisma.workspaceSetting.update({ where: { id: row.id }, data: { value } });
  else await prisma.workspaceSetting.create({ data: { key, value, workspaceGroupId: groupId } });
  remembered.set(slot(groupId, key), { value, at: Date.now() });
}

/** Forget what was read, so the next getConfig asks the database. */
export async function refresh(key: string, groupId: bigint | number) {
  remembered.delete(slot(groupId, key));
}

export const fetchworkspace = (groupId: bigint | number) => prisma.workspace.findFirst({ where: { groupId } });
