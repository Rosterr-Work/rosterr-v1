import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

// The session types that can be started without scheduling (the "start a session now" picker), for anyone who may see or start
// sessions of some kind.

const KINDS = ["shift", "training", "event", "other"];

export default withPermissionCheck(
  handler,
  KINDS.flatMap((kind) => [`sessions_${kind}_see`, `sessions_${kind}_unscheduled`])
);

export async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean; error?: string; sessionTypes?: unknown[] }>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const types = await prisma.sessionKind.findMany({
      where: { workspaceGroupId: parseInt(req.query.id as string), allowUnscheduled: true },
      include: { schedule: true },
    });
    const sessionTypes = JSON.parse(JSON.stringify(types, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
    return res.status(200).json({ success: true, sessionTypes });
  } catch (error) {
    console.error("Error fetching session types:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch session types" });
  }
}
