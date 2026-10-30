import { featureSettingRoute } from "@/utils/settings/featureToggle";

// Whether recommendations are on and which Roblox ranks may be recommended. Either can be sent on its own.
export default featureSettingRoute({
  key: "recommendations",
  action: "settings.update",
  clean: (body, existing) => {
    const ranks = body.allowedRanks !== undefined ? body.allowedRanks : existing?.allowedRanks ?? [];
    if (!Array.isArray(ranks) || ranks.length > 255 || !ranks.every((n: unknown) => Number.isInteger(n))) return { ok: false, error: "Ranks must be a list of numbers" };
    return { ok: true, value: { enabled: body.enabled !== undefined ? Boolean(body.enabled) : Boolean(existing?.enabled), allowedRanks: ranks } };
  },
});
