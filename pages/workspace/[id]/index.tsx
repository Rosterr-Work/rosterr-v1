import type { GetServerSideProps } from "next";
import type { pageWithLayout } from "@/layoutTypes";
import Workspace from "@/layouts/workspace";
import HomePage from "@/components/home/HomePage";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";

// The workspace's Home: a greeting and the boxes its admins chose. Each box loads its own data. See components/home/HomePage.tsx.
export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const Home: pageWithLayout = () => <HomePage />;
Home.layout = Workspace;

export default Home;
