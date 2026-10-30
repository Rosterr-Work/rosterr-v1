import type { GetServerSidePropsContext } from "next";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { allows } from "@/utils/access/engine";
import { loadAccess } from "@/utils/access/store";
import { orderedDepartments } from "@/utils/directory/load";
import ViewsHome, { type Can } from "@/components/views/ViewsHome";

// The Staff table. What the person may do comes from all of their roles added together; the table itself loads from views/staff.
export const getServerSideProps = withPermissionCheckSsr(async ({ params, req }: GetServerSidePropsContext) => {
  const groupId = parseInt(params?.id as string);
  const userId = String(req.session?.userid);
  const [access, departments] = await Promise.all([loadAccess(BigInt(userId), groupId), orderedDepartments(groupId)]);
  const may = (p: string) => Boolean(access && allows(access, p));
  const can: Can = {
    editViews: may("edit_views"),
    createViews: may("create_views"),
    deleteViews: may("delete_views"),
    useViews: may("use_views"),
    massActions: may("use_mass_actions"),
    profiles: may("view_member_profiles"),
    export: may("export_views"),
    promote: may("logbook_promotion"),
    warn: may("logbook_warning"),
    terminate: may("logbook_termination"),
    adjust: may("activity_adjustments"),
  };
  return { props: { groupId: String(groupId), userId, can, departments: departments.map((d) => ({ id: d.id, name: d.name })) } };
}, "view_members");

type Props = { groupId: string; userId: string; can: Can; departments: { id: string; name: string }[] };
const Views: pageWithLayout<Props> = (props) => <ViewsHome {...props} />;
Views.layout = workspace;

export default Views;
