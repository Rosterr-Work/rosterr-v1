import type toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconArrowRight, IconDownload, IconShield } from "@tabler/icons-react";
import { ghostButton } from "@/components/ui/parts";
import type { FC } from "@/types/settingsComponent";
import FeatureSwitch from "./FeatureSwitch";

const Moderation: FC<{ triggerToast: typeof toast }> = ({ triggerToast }) => {
  const router = useRouter();
  return (
    <FeatureSwitch
      triggerToast={triggerToast}
      route="moderation"
      setting="moderationEnabled"
      noun="moderation"
      title="Moderation"
      hint="Cases, warnings and bans against members, with appeals."
      icon={IconShield}
      beta
      whenOn={
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cases, bans and appeals are under Moderation in the main menu, for admins and people with the <em>View moderation</em> permission. Moderators who act also need <em>Create moderation cases</em> and <em>Execute punishments</em>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => router.push(`/workspace/${router.query.id}/moderation`)} className={ghostButton}>
              Open moderation <IconArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => router.push(`/workspace/${router.query.id}/settings?section=permissions`)} className={ghostButton}>
              Set role permissions
            </button>
            <button type="button" onClick={() => window.open(`/api/workspace/${router.query.id}/settings/moderation/download`)} className={ghostButton}>
              <IconDownload className="h-4 w-4" /> Roblox module
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Install the Roblox module in your experience to apply bans and kicks in game.</p>
        </div>
      }
    />
  );
};

Moderation.title = "Moderation";
Moderation.description = "Cases, warnings and actions against members.";

export default Moderation;
