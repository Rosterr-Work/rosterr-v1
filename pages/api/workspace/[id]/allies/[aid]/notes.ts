import type { NextApiRequest, NextApiResponse } from "next";
import { withAllyAccess } from "@/utils/allies/access";
import { addNote, deleteNote, editNote } from "@/utils/allies/service";
import { ids, send } from "@/utils/allies/http";

// Alliance notes: POST adds one, PUT changes one, DELETE removes one. Each needs its own right (or being the alliance's representative).
export default withAllyAccess(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    const base = { ...ids(req), body: req.body };
    if (req.method === "POST") return send(res, await addNote(base));
    if (req.method === "PUT") return send(res, await editNote(base));
    if (req.method === "DELETE") return send(res, await deleteNote(base));
    return res.status(405).json({ success: false, error: "Method not allowed" });
  },
  { permissions: { POST: ["add_alliance_notes"], PUT: ["edit_alliance_notes"], DELETE: ["delete_alliance_notes"] }, reps: true }
);
