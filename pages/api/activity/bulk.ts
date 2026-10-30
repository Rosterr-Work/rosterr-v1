import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { withActivityApiRateLimit } from "@/utils/prtl";
import { findActivityConfigByKey } from "@/utils/activityAuth";
import { handleEvent, MAX_EVENTS, readEvent } from "@/utils/activity/ingest";
import { isOrderEvent } from "@/utils/orders/rules";
import { recordOrderEvents } from "@/utils/orders/service";

// The in-game activity package, many at once: POST { events: [{ type: "create" | "end", userid, placeid?, idleTime?, messages? }] } (up to 200).
// Orders served in a café or shop game ride in the same batches: { type: "order", id, userid, items, customerid?, rating?, time? } and
// { type: "rating", id, rating } (utils/orders/rules.ts); their counts come back under `results.orders`.
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  if (!req.headers.authorization) return res.status(400).json({ success: false, error: "Authorization key missing" });
  const events = req.body?.events;
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ success: false, error: "Events array is required and must not be empty" });
  if (events.length > MAX_EVENTS) return res.status(400).json({ success: false, error: `No more than ${MAX_EVENTS} events at once` });

  try {
    const config = await findActivityConfigByKey(req.headers.authorization);
    if (!config) return res.status(401).json({ success: false, error: "Unauthorized" });
    const minRank = (config.value as any)?.role ?? null;
    const results = { created: 0, ended: 0, failed: 0, errors: [] as string[], orders: undefined as Awaited<ReturnType<typeof recordOrderEvents>> | undefined };
    const orderEvents = events.filter(isOrderEvent);
    if (orderEvents.length) {
      results.orders = await recordOrderEvents(config.workspaceGroupId, orderEvents);
      results.failed += results.orders.failed;
      results.errors.push(...results.orders.errors);
    }
    for (const raw of events) {
      if (isOrderEvent(raw)) continue;
      const read = readEvent(raw);
      if (!read.ok) {
        results.failed++;
        results.errors.push(read.error);
        continue;
      }
      try {
        const outcome = await handleEvent(config.workspaceGroupId, read.value, minRank);
        if (outcome === "created") results.created++;
        else if (outcome === "ended" || outcome === "reported") results.ended++;
        else if (outcome === "none") {
          results.failed++;
          results.errors.push(`No active session for user ${read.value.userId}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing event for user ${read.value.userId}: ${error?.message ?? "failed"}`);
      }
    }
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("[activity] bulk:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export { handler };
export default withActivityApiRateLimit(withSessionRoute(handler));
