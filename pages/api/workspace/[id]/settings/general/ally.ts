import { enabledOnly, featureSettingRoute } from "@/utils/settings/featureToggle";

export default featureSettingRoute({ key: "allies", action: "settings.general.allies.update", auditBefore: true, clean: enabledOnly });
