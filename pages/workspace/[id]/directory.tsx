import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import ModernDirectory from "@/components/directory/ModernDirectory";

// The directory loads its own members and departments from /api/workspace/[id]/directory/list.
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }), "view_directory");

const StaffDirectoryPage: pageWithLayout<{}> = () => <ModernDirectory />;

StaffDirectoryPage.layout = workspace;

export default StaffDirectoryPage;
