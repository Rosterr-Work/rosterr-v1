import { publicRoute } from "@/utils/publicApi/route";
import { createScheduled } from "@/utils/publicApi/sessions";

// POST .../sessions/create-scheduled: a session on a repeating schedule, using an existing schedule (scheduleId) or making a new session type
// with its schedule (sessionType). Made as the owner of the API key.
export default publicRoute("POST", async ({ req, res, workspaceId, key }) => {
  const made = await createScheduled({ workspaceId, actorId: BigInt(key.createdById), body: req.body });
  if (!made.ok) return res.status(made.status).json({ success: false, error: made.error, ...made.extra });
  return res.status(201).json({ success: true, message: "Session created successfully (Scheduled)", session: made.session });
});
