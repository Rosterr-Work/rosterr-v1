import { enabledOnly, featureSettingRoute } from "@/utils/settings/featureToggle";

export default featureSettingRoute({ key: "guides", action: "settings.update", clean: enabledOnly });
