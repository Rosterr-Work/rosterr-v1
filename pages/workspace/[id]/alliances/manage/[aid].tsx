import type { GetServerSidePropsContext } from "next";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import AllyPage from "@/components/allies/AllyPage";

// One alliance. Whether this person may open it is decided by allies/[aid]/overview, which answers 404 when not.
export const getServerSideProps = withPermissionCheckSsr(async ({ params }: GetServerSidePropsContext) => ({ props: { groupId: String(params?.id), allyId: String(params?.aid) } }));

const ManageAlly: pageWithLayout<{ groupId: string; allyId: string }> = ({ groupId, allyId }) => <AllyPage groupId={groupId} allyId={allyId} />;
ManageAlly.layout = workspace;

export default ManageAlly;
