import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck, invalidatePermissionsCache } from "@/utils/permissionsManager";
import { stripe } from "@/utils/stripe";
import { destroyWorkspace } from "@/utils/workspace/destroy";

// Deletes a workspace and everything in it. Only its owner may (an old workspace with none recorded: any of its admins). Billing is
// stopped first, and if that can't be done nothing is deleted. What is removed is worked out by utils/workspace/destroy.ts.
export default withPermissionCheck(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" });
  const workspaceId = parseInt(String(req.query.id), 10);
  const userId = req.session?.userid;
  if (!userId) return res.status(401).json({ success: false, error: "Not logged in" });
  if (!workspaceId) return res.status(400).json({ success: false, error: "No workspace id provided" });
  // Destroying a workspace is for its owner; platform staff in support mode act as someone else and do not get to do it.
  if (req.session.platformAccess) return res.status(403).json({ success: false, error: "Not available in support mode" });

  try {
    const workspace = await prisma.workspace.findUnique({ where: { groupId: workspaceId }, include: { subscription: true } });
    if (!workspace) return res.status(404).json({ success: false, error: "Workspace not found" });

    const membership = await prisma.membership.findUnique({ where: { workspaceGroupId_userId: { workspaceGroupId: workspaceId, userId: BigInt(userId) } } });
    const isOwner = workspace.ownerId != null ? workspace.ownerId === BigInt(userId) : Boolean(membership?.isAdmin);
    if (!isOwner) return res.status(403).json({ success: false, error: "Only workspace owners can delete the workspace" });

    // Stop billing first: a deleted workspace must not leave a card being charged. If Stripe can't be reached, stop with everything intact.
    const subscriptionId = workspace.subscription?.stripeSubscriptionId;
    if (subscriptionId && workspace.subscription?.status !== "CANCELED") {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (error: any) {
        if (error?.code !== "resource_missing") {
          console.error("Failed to cancel the subscription before deleting a workspace:", error);
          return res.status(502).json({ success: false, error: "Couldn't cancel this workspace's subscription, so nothing was deleted. Try again in a moment." });
        }
      }
    }

    await destroyWorkspace(workspaceId);
    invalidatePermissionsCache(undefined, workspaceId);
    // The workspace's own log went with it, so the deletion is recorded with no workspace attached.
    console.info(`[Workspace] ${workspaceId} deleted by ${userId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});
