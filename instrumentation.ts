// Runs once when the server starts (Next.js calls register).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Database ids are BigInt; JSON can't carry them, so every one goes out as a string.
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const { closeActiveSessions } = await import("./utils/closesessions");
  await closeActiveSessions();

  // Keep the Discord bots connected so they show as online. It must never hold up or break startup.
  try {
    const { startGateway } = await import("./utils/discordBot/gateway/manager");
    startGateway();
  } catch (error) {
    console.error("[STARTUP] Could not start the Discord gateway", error);
  }

  // Slash commands for the shared bot and every workspace's own bot (utils/discordBot/interactions/app.ts). Registered here as well as by
  // the minute-by-minute sweep (/api/cron/discord-outbox), so they appear even on a server where that job isn't scheduled. Cheap: after
  // the first success it only talks to Discord when the command list changes.
  try {
    const { ensureAllCommands } = await import("./utils/discordBot/interactions/app");
    const register = () =>
      void ensureAllCommands()
        .then((r) => (r.registered || r.errors ? console.log(`[DiscordBot] slash commands: ${r.registered} registered, ${r.errors} failed`) : undefined))
        .catch((error) => console.error("[DiscordBot] slash commands", (error as Error)?.message));
    setTimeout(register, 10_000).unref?.();
    setInterval(register, 60 * 60_000).unref?.();
  } catch (error) {
    console.error("[STARTUP] Could not register slash commands", error);
  }

  // Scheduled staff messages: send the ping of any that has come due. Every minute; safe on several servers (see releaseDueMessages).
  try {
    const { releaseDueMessages } = await import("./utils/platform/messages");
    const tick = () => void releaseDueMessages().catch((error) => console.error("[Messages] scheduler", (error as Error)?.message));
    setTimeout(tick, 15_000).unref?.();
    setInterval(tick, 60_000).unref?.();
  } catch (error) {
    console.error("[STARTUP] Could not start the message scheduler", error);
  }

  // Rosterr's own social media posts (utils/social/service.ts): post any that have come due, every minute. SOCIAL_SCHEDULER=off turns it off.
  if (process.env.SOCIAL_SCHEDULER !== "off") {
    try {
      const { runSocialScheduler } = await import("./utils/social/service");
      const tick = () => void runSocialScheduler().catch((error) => console.error("[Social] scheduler", (error as Error)?.message));
      setTimeout(tick, 20_000).unref?.();
      setInterval(tick, 60_000).unref?.();
    } catch (error) {
      console.error("[STARTUP] Could not start the social media scheduler", error);
    }
  }

  // Once a day, walk the audit log's chain of hashes and tell the Super Admins if anything in it has been changed or removed.
  try {
    const { runAuditIntegrityCheck } = await import("./utils/platform/auditCheck");
    const check = () => void runAuditIntegrityCheck().catch((error) => console.error("[Audit] integrity check", (error as Error)?.message));
    setTimeout(check, 2 * 60_000).unref?.();
    setInterval(check, 24 * 60 * 60_000).unref?.();
  } catch (error) {
    console.error("[STARTUP] Could not start the audit integrity check", error);
  }

  // The abuse scan (utils/abuseScan.ts): a few minutes after every start, then once a day. ABUSE_SCAN=off turns it off.
  try {
    const { runAbuseScan } = await import("./utils/abuseScan");
    const scan = () => void runAbuseScan().catch((error) => console.error("[Abuse scan]", (error as Error)?.message));
    setTimeout(scan, 3 * 60_000).unref?.();
    setInterval(scan, 24 * 60 * 60_000).unref?.();
  } catch (error) {
    console.error("[STARTUP] Could not start the abuse scan", error);
  }

  // Automatic promotion rules (utils/promotion/autoService.ts): a few minutes after every start, then once a day. Each workspace runs at
  // most once per UTC day across all servers (a JobClaim). AUTO_PROMOTIONS=off turns it off.
  try {
    const { runAutoPromotions } = await import("./utils/promotion/autoService");
    const promote = () => void runAutoPromotions().catch((error) => console.error("[Auto promotions]", (error as Error)?.message));
    setTimeout(promote, 4 * 60_000).unref?.();
    setInterval(promote, 24 * 60 * 60_000).unref?.();
  } catch (error) {
    console.error("[STARTUP] Could not start automatic promotions", error);
  }

  if (process.env.NEXT_MULTI?.toLowerCase() === "true") {
    const { assignBatches } = await import("./utils/startupBatches");
    const counts = await assignBatches();
    console.log("[STARTUP] Workspaces per batch:", counts);
  }
}
