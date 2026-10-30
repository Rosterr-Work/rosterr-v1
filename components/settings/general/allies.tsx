import type toast from "react-hot-toast";
import { IconBuildingCommunity } from "@tabler/icons-react";
import type { FC } from "@/types/settingsComponent";
import FeatureSwitch from "./FeatureSwitch";

const Allies: FC<{ triggerToast: typeof toast }> = ({ triggerToast }) => (
  <FeatureSwitch triggerToast={triggerToast} route="ally" setting="alliesEnabled" noun="alliances" title="Alliances" hint="Keep track of groups you are allied with, and log visits to them." icon={IconBuildingCommunity} />
);

Allies.title = "Alliances";
Allies.description = "Keep track of other groups you are allied with, and log visits to them.";

export default Allies;
