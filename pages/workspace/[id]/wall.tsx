import type { pageWithLayout } from "@/layoutTypes";
import type { GetServerSideProps } from "next";
import Workspace from "@/layouts/workspace";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import ModernWall from "@/components/wall/ModernWall";

// The page reads its posts a page at a time from /wall/feed, so the server loads none here.
export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const Wall: pageWithLayout<{}> = () => <ModernWall />;

Wall.layout = Workspace;

export default Wall;
