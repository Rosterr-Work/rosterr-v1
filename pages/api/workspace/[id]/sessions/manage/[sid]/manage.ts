import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { editSessions } from "@/utils/sessions/edit";
import { readEdit } from "@/utils/sessions/form";

// The phone apps' way of editing one session: a new name, length and a full date-time (`date` as an ISO time). Answers with the session's
// fresh details. The website uses POST .../[sid]/update.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body ?? {};
  const instant = !body.time && typeof body.date === "string" ? new Date(body.date) : undefined;
  if (body.date === undefined || body.date === null || body.date === "") return res.status(400).json({ error: "Session date is required" });
  if (instant && Number.isNaN(instant.getTime())) return res.status(400).json({ error: "That isn't a date." });
  const read = readEdit({ name: body.name, duration: body.duration, description: body.description, gameId: body.gameId, statues: body.statues, ...(body.time ? { date: body.date, time: body.time, timeZone: body.timeZone } : {}) });
  if (!read.ok) return res.status(400).json({ error: read.error });
  const groupId = parseInt(String(req.query.id), 10);
  const done = await editSessions({ groupId, actorId: req.session.userid, sessionId: String(req.query.sid), input: read.value, instant });
  if (!done.ok) return res.status(done.status).json({ error: done.error });
  return res.status(200).json({ success: true, id: String(req.query.sid) });
});
