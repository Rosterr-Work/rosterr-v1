import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { baseUrlFrom, createLink, deleteLink, listLinks, updateLink } from "@/utils/policies/links";

// The shareable links of one policy (see utils/policies/links.ts).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = { groupId: BigInt(String(req.query.id)), docId: String(req.query.docId), base: baseUrlFrom(req.headers, process.env.NEXTAUTH_URL), by: BigInt(req.session.userid) };
  const answer = async (run: Promise<any>, key: string, status = 200) => {
    const done = await run;
    return done.ok ? res.status(status).json({ success: true, ...(key ? { [key]: done.value } : {}) }) : res.status(done.status).json({ success: false, error: done.error });
  };
  switch (req.method) {
    case "GET":
      return answer(listLinks(ctx), "links");
    case "POST":
      return answer(createLink(ctx, req.body), "link", 201);
    case "PATCH":
      return answer(updateLink(ctx, req.body), "link");
    case "DELETE":
      return answer(deleteLink(ctx, req.body?.linkId), "");
    default:
      return res.status(405).json({ success: false, error: "Method not allowed" });
  }
}, "manage_policies");
