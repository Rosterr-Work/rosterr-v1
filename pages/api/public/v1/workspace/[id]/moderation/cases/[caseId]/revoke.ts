import { creatorMayActAs, CANT_ACT_AS } from "@/utils/publicApi/actAs";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { idOf } from "@/utils/moderation/caseRules";
import { revokeCase } from "@/utils/moderation/service";
import { fail, publicRoute } from "@/utils/publicApi/route";

// POST .../moderation/cases/{caseId}/revoke { revokedByUserId, reason }: takes the punishment back, as that person (who has to be allowed to).
export default publicRoute("POST", async ({ req, res, workspaceId }) => {
  const { revokedByUserId, reason } = req.body ?? {};
  if (!revokedByUserId || typeof reason !== "string" || !reason.trim()) return fail(res, 400, "revokedByUserId and reason are required");
  const by = idOf(revokedByUserId);
  if (!by) return fail(res, 400, "Invalid revokedByUserId");
  if (!(await creatorMayActAs(workspaceId, by))) return fail(res, 403, CANT_ACT_AS);
  const access = await loadAccess(by, workspaceId);
  if (!access || !allows(access, "revoke_punishments")) return fail(res, 403, "That person isn't allowed to revoke punishments in this workspace.");
  const done = await revokeCase({ groupId: BigInt(workspaceId), actorId: by, caseId: String(req.query.caseId ?? ""), reason, via: "api" });
  if (!done.ok) return fail(res, done.status, done.error);
  const c = done.case;
  return res.status(200).json({ success: true, data: { id: c.id, revokedAt: c.revokedAt, revokedBy: Number(c.revokedBy), revokeReason: c.revokeReason } });
});
