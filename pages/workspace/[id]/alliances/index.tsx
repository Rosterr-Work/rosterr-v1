import type { GetServerSidePropsContext } from "next";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import AlliancesHome from "@/components/allies/AlliancesHome";

// The allied groups. Everything loads from allies/overview.
export const getServerSideProps = withPermissionCheckSsr(async ({ params }: GetServerSidePropsContext) => ({ props: { groupId: String(params?.id) } }));

const Alliances: pageWithLayout<{ groupId: string }> = ({ groupId }) => <AlliancesHome groupId={groupId} />;
Alliances.layout = workspace;

export default Alliances;
