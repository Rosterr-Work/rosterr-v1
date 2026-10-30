import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { queryAudit } from "@/utils/logs";
import { parseAuditQuery } from "@/utils/settings/auditQuery";
import { resolvePeople } from "@/utils/settings/people";
import { loadUsernames, withActorNames } from "@/utils/settings/auditRows";

// A page of the workspace's audit log, newest first, filtered by person, action, text and dates (Settings → Audit logs).

export default withPermissionCheck(handler, "view_audit_logs");

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; rows?: unknown[]; total?: number }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(req.query.id as string);
  if (!groupId) return res.status(400).json({ success: false, error: "Missing workspace id" });

  // A page number or size that isn't a number is refused here; it used to reach the database as NaN and answer 500.
  const parsed = parseAuditQuery(req.query);
  if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });
  const f = parsed.filters;

  try {
    // A person is a user id, or part of a username.
    let userIds: number[] | undefined;
    if (f.person) {
      userIds = await resolvePeople(groupId, f.person);
      if (!userIds.length) return res.status(200).json({ success: true, rows: [], total: 0 });
    }
    const found = await queryAudit(groupId, { userId: f.userId, userIds, action: f.action, search: f.search, from: f.from, to: f.to, skip: f.page * f.limit, take: f.limit });
    const rows = found.rows || [];
    return res.status(200).json({ success: true, rows: withActorNames(rows, await loadUsernames(rows)), total: found.total });
  } catch (error) {
    console.error("[Audit] Error querying audits", error);
    return res.status(500).json({ success: false, error: "Internal error" });
  }
}
