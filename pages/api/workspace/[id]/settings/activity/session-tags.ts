import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { createTag, deleteTag, listTags, updateTag } from "@/utils/sessions/appearance";

// Session tags: GET lists, POST makes one, PATCH changes one ({ id, ... }), DELETE removes one ({ id }). Only this workspace's tags,
// and only for people who manage features. See utils/sessions/appearance.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const groupId = parseInt(String(req.query.id), 10);
  const actor = Number(req.session.userid);
  const send = (done: { ok: true } & Record<string, unknown> | { ok: false; status: number; error: string }, status = 200) => {
    if (!done.ok) return res.status(done.status).json({ success: false, error: done.error });
    const { ok: _ok, ...rest } = done;
    return res.status(status).json({ success: true, ...rest });
  };
  if (req.method === "GET") return res.status(200).json({ success: true, tags: await listTags(groupId) });
  if (req.method === "POST") return send(await createTag(groupId, actor, req.body), 201);
  if (req.method === "PATCH") return send(await updateTag(groupId, actor, String(req.body?.id ?? ""), req.body));
  if (req.method === "DELETE") return send(await deleteTag(groupId, actor, String(req.body?.id ?? "")));
  return res.status(405).json({ success: false, error: "Method not allowed" });
}, "manage_features");
