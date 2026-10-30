import type { GetServerSidePropsContext, NextApiHandler } from "next";
import { modernPermissionCheck, modernPermissionCheckSsr } from "@/utils/access/guard";
import { invalidatePermissionsCache as forgetRights } from "@/utils/access/store";

// The one import every page and API route uses to keep to the people allowed. The engine is in utils/access/.

export const withPermissionCheck = (handler: NextApiHandler, permission?: string | string[]) => modernPermissionCheck(handler, permission);

export const withPermissionCheckSsr = (handler: (context: GetServerSidePropsContext) => Promise<any>, permission?: string | string[]) =>
  modernPermissionCheckSsr(handler, permission);

/** Something changed someone's rights (or everyone's in a workspace, or all): what was remembered is forgotten. */
export function invalidatePermissionsCache(userId?: number | bigint, workspaceId?: number): void {
  forgetRights(userId, workspaceId);
}

export { checkGroupRoles, checkSpecificUser } from "@/utils/roleSync";
export { refreshGameThumbnailsForWorkspace } from "@/utils/gameThumbnails";
