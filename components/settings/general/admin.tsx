import { useState } from "react";
import { useRouter } from "next/router";
import type toast from "react-hot-toast";
import { useRecoilValue } from "recoil";
import { IconTransfer, IconTrash } from "@tabler/icons-react";
import { loginState, workspacestate } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { openIntercom } from "@/components/IntercomLoader";
import DeleteWorkspace from "./delete";
import { dangerButton, ghostButton } from "@/components/ui/parts";
import SettingRow from "@/components/ui/SettingRow";

// The owner's corner of Settings: ask support to hand the workspace over, or delete it. Nobody else sees it.

type Props = { triggerToast: typeof toast; isAdmin?: boolean };

const Admin: FC<Props> = ({ isAdmin }) => {
  const workspace = useRecoilValue(workspacestate);
  const login = useRecoilValue(loginState);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  // The recorded owner; very old workspaces have none recorded, so their admins still see this.
  const admin = isAdmin !== undefined ? isAdmin : workspace.isAdmin === true;
  const isOwner = workspace.ownerId != null ? Number(workspace.ownerId) === Number(login.userId) : admin;
  if (!isOwner) return null;

  const askSupport = async () => {
    // Opens live chat; with chat switched off, the contact page is the way in.
    const opened = await openIntercom().catch(() => false);
    if (!opened) router.push("/contact");
  };

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
      <SettingRow className="pt-0" title="Transfer ownership" description="Our support team checks and approves every change of owner.">
        <button type="button" onClick={askSupport} className={ghostButton}>
          <IconTransfer size={16} />
          Ask support
        </button>
      </SettingRow>
      <SettingRow className="pb-0" title="Delete this workspace" description="Removes everything for good: members, sessions, documents and settings.">
        <button type="button" onClick={() => setConfirming(true)} className={dangerButton}>
          <IconTrash size={16} />
          Delete
        </button>
      </SettingRow>

      <DeleteWorkspace isOpen={confirming} onClose={() => setConfirming(false)} workspaceId={workspace.groupId} workspaceName={workspace.groupName || ""} onSuccess={() => router.push("/")} />
    </div>
  );
};

Admin.title = "Transfer or delete this workspace";
Admin.description = "Ask support to hand the workspace to a new owner, or delete it for good. Only the owner sees this.";

export default Admin;
