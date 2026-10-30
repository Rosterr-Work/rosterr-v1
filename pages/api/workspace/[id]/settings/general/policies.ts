import { enabledOnly, featureSettingRoute } from "@/utils/settings/featureToggle";

export default featureSettingRoute({ key: "policies", action: "settings.general.policies.update", auditBefore: true, clean: enabledOnly });
