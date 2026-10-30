import type { GetServerSideProps } from "next";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import SettingsHome from "@/components/settings/SettingsHome";
import { loadAccess } from "@/utils/access/store";
import prisma from "@/utils/database";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { getGroupRoles } from "@/utils/roblox";

// Settings. What a person sees is worked out from all of their roles together. The roles, departments and Roblox ranks are only
// loaded when the Permissions section is the one being opened, since nothing else shows them.
export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async ({ params, req, query }) => {
    const groupId = Number.parseInt(String(params?.id), 10);
    const access = await loadAccess(BigInt(req.session.userid as number), groupId);
    // The role list with every permission is for admins, as the roles API and the Permissions section are; other settings delegates never get it.
    const wantsPeople = query.section === "permissions" && Boolean(access && (access.admin || access.permissions.has("admin")));
    const [roles, departments, grouproles] = wantsPeople
      ? await Promise.all([prisma.staffRole.findMany({ where: { workspaceGroupId: groupId } }), prisma.staffDepartment.findMany({ where: { workspaceGroupId: groupId } }), getGroupRoles(groupId)])
      : [[], [], []];
    return {
      props: {
        roles: JSON.parse(JSON.stringify(roles)),
        departments: JSON.parse(JSON.stringify(departments)),
        grouproles,
        isAdmin: Boolean(access?.admin),
        userPermissions: access ? [...access.permissions] : [],
      },
    };
  },
  ["admin", "workspace_customisation", "reset_activity", "manage_features", "manage_mail", "manage_apikeys", "view_audit_logs", "support"]
);

type Props = { roles: any[]; departments: any[]; grouproles: any[]; isAdmin: boolean; userPermissions: string[] };

const Settings: pageWithLayout<Props> = (props) => <SettingsHome {...props} />;
Settings.layout = Workspace;

export default Settings;
