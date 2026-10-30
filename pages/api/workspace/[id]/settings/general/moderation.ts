import { featureSettingRoute } from "@/utils/settings/featureToggle";

// The stored value also holds the key the Roblox module signs in with, so a read says only whether moderation is on, and a change keeps
// the key (replacing the whole value would sign every game using it out of the moderation API).
export default featureSettingRoute({
  key: "moderation",
  action: "settings.update",
  keepOthers: true,
  whenMissing: { value: { enabled: false } },
  present: (stored) => ({ enabled: Boolean(stored.enabled) }),
  clean: (body, existing) => ({ ok: true, value: { enabled: body.enabled !== undefined ? Boolean(body.enabled) : Boolean(existing?.enabled) } }),
});
