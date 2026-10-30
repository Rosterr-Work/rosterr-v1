import type toast from "react-hot-toast";
import { IconClock } from "@tabler/icons-react";
import type { FC } from "@/types/settingsComponent";
import FeatureSwitch from "./FeatureSwitch";

const Recommendations: FC<{ triggerToast: typeof toast }> = ({ triggerToast }) => (
  <FeatureSwitch
    triggerToast={triggerToast}
    route="recommendations"
    setting="recommendationsEnabled"
    noun="recommendations"
    title="Recommendations"
    hint="Let members recommend each other, and review the recommendations."
    icon={IconClock}
    beta
  />
);

Recommendations.title = "Recommendations";
Recommendations.description = "Let members recommend each other, and review the recommendations.";

export default Recommendations;
