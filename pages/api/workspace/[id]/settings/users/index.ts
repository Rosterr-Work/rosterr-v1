import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { listRoleMembers, roleCounts } from "@/utils/settings/members";

// The workspace's people for Settings > Permissions. With no ?roleId the roles and how many people each has (matching ?search);
// with one, a page of that role's people (?page, ?pageSize, ?search).
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
  const groupId = parseInt(String(req.query.id), 10);
  const search = String(req.query.search ?? "");
  try {
    if (!req.query.roleId) {
      const roles = await roleCounts(groupId, search);
      return res.status(200).json({ success: true, roles, roleCounts: Object.fromEntries(roles.map((r) => [r.id, r.count])) });
    }
    const page = await listRoleMembers(groupId, String(req.query.roleId), { search, page: parseInt(String(req.query.page ?? "1"), 10) || 1, pageSize: parseInt(String(req.query.pageSize ?? "20"), 10) || 20 });
    if (!page) return res.status(404).json({ success: false, error: "Role not found" });
    return res.status(200).json({ success: true, ...page });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}, "admin");
