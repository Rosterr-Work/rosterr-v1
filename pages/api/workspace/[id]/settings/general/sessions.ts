import { enabledOnly, featureSettingRoute } from "@/utils/settings/featureToggle";

// Nothing reads this one back (session pages are always on for people with the right); only the switch is saved.
export default featureSettingRoute({ key: "sessions", action: "settings.general.sessions.update", auditBefore: true, clean: enabledOnly, whenMissing: { value: undefined } });
