import type toast from "react-hot-toast";
import { IconFileCheck } from "@tabler/icons-react";
import type { FC } from "@/types/settingsComponent";
import FeatureSwitch from "./FeatureSwitch";

const Policies: FC<{ triggerToast: typeof toast }> = ({ triggerToast }) => (
  <FeatureSwitch triggerToast={triggerToast} route="policies" setting="policiesEnabled" noun="policies" title="Policies" hint="Share documents members must read and acknowledge, and see who has." icon={IconFileCheck} />
);

Policies.title = "Policies";
Policies.description = "Share documents that members must read and acknowledge.";

export default Policies;
