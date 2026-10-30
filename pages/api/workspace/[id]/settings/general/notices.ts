import { enabledOnly, featureSettingRoute } from "@/utils/settings/featureToggle";

export default featureSettingRoute({ key: "notices", action: "settings.update", clean: enabledOnly });
