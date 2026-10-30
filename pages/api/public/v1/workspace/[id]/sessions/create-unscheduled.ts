import { publicRoute } from "@/utils/publicApi/route";
import { createUnscheduled } from "@/utils/publicApi/sessions";

// POST .../sessions/create-unscheduled: a one-off session, of an existing session type (sessionTypeId) or of a new one (sessionType).
export default publicRoute("POST", async ({ req, res, workspaceId, key }) => {
  const made = await createUnscheduled({ workspaceId, actorId: BigInt(key.createdById), body: req.body });
  if (!made.ok) return res.status(made.status).json({ success: false, error: made.error, ...made.extra });
  return res.status(201).json({ success: true, message: "Session created successfully (unscheduled)", session: made.session });
});
