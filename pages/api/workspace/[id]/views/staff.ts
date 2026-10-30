import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { groupRoles } from "@/utils/ranks";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { COLUMN_IDS, sortKeyOf, type ColumnId } from "@/utils/views/columns";
import { readCombine, readFilters, readSort } from "@/utils/views/filters";
import { toCsv, toXls } from "@/utils/views/export";
import { toUser } from "@/utils/views/rows";
import { loadStaff } from "@/utils/views/staff";

/** The columns a request names (JSON list of ids). Anything that isn't a column is ignored. */
const readColumns = (raw: unknown): ColumnId[] => {
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : [];
    return Array.isArray(list) ? COLUMN_IDS.filter((id) => list.includes(id)) : [];
  } catch {
    return [];
  }
};

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const groupId = parseInt(req.query.id as string);
    const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
    const filters = readFilters(req.query.filters);
    const combine = readCombine(req.query.filterOperator);
    const sort = readSort(req.query.sortBy, req.query.sortDesc, sortKeyOf);
    const columns = readColumns(req.query.columns);
    const format = req.query.format === "csv" || req.query.format === "xls" ? req.query.format : null;

    try {
      if (format) {
        // A spreadsheet of the whole table needs the export right, as the Directory export does (view_members alone shows it a page at a time).
        const access = await loadAccess(req.session.userid as number, groupId);
        if (!access || !allows(access, "export_views")) return res.status(403).json({ error: "You do not have permission to export" });
        // The whole filtered table as a file, in the order and with the columns the page shows. Not paged.
        const everything = await loadStaff(groupId, { search, filters, combine, sort, page: 0, pageSize: Number.MAX_SAFE_INTEGER, columns: columns.length ? columns : COLUMN_IDS });
        const shown = columns.length ? columns : COLUMN_IDS;
        const body = format === "csv" ? toCsv(everything.rows, shown) : toXls(everything.rows, shown);
        res.setHeader("Content-Type", format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.ms-excel; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="staff-export.${format}"`);
        return res.status(200).send(body);
      }

      const page = Math.max(0, parseInt(req.query.page as string) || 0);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 10));
      const result = await loadStaff(groupId, { search, filters, combine, sort, page, pageSize, columns: columns.length ? columns : COLUMN_IDS });
      const roles = (await groupRoles(groupId)).slice().sort((a, b) => a.rank - b.rank);
      return res.status(200).json({
        users: result.rows.map(toUser),
        ranks: roles,
        truncated: result.truncated,
        pagination: { page, pageSize, totalUsers: result.total, totalPages: Math.ceil(result.total / pageSize) },
      });
    } catch (error) {
      console.error("Error fetching staff data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  ["view_members"]
);
