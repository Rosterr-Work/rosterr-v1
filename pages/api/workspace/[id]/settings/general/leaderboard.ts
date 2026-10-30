import { featureSettingRoute } from "@/utils/settings/featureToggle";

export const LEADERBOARD_STYLES = ["list", "podium"];

// How the leaderboard is drawn. Either field can be sent on its own (the style picker sends only the style).
export default featureSettingRoute({
  key: "leaderboard",
  action: "settings.general.leaderboard.update",
  auditBefore: true,
  whenMissing: { value: null },
  clean: (body, existing) => {
    const enabled = body.enabled !== undefined ? body.enabled : existing?.enabled ?? true;
    const style = body.style !== undefined ? body.style : existing?.style ?? "list";
    if (typeof enabled !== "boolean") return { ok: false, error: "Enabled must be true or false" };
    if (!LEADERBOARD_STYLES.includes(style)) return { ok: false, error: "Unknown style" };
    return { ok: true, value: { enabled, style } };
  },
});
