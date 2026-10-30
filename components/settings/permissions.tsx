import { useState } from "react";
import type { UIRole } from "@/utils/database";
import type { RobloxRole } from "@/utils/roblox";
import Roles from "@/components/settings/permissions/roles";
import Departments from "@/components/settings/permissions/departments";
import Users from "@/components/settings/permissions/users";

// Settings → Permissions: who is in which role, the roles themselves, and the departments.

type Props = { roles: UIRole[]; departments?: unknown[]; grouproles: RobloxRole[] };

export default function Permissions({ roles: initial, grouproles }: Props) {
  // The roles editor changes this list as roles are made, saved and deleted; the people list reads the same one.
  const [roles, setRoles] = useState<UIRole[]>(initial);

  return (
    <div className="space-y-3">
      <Users roles={roles} />
      <Roles roles={roles} setRoles={setRoles} grouproles={grouproles} />
      <Departments />
    </div>
  );
}
