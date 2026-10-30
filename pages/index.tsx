import type { NextPage } from "next";
import { withSessionSsr } from "@/lib/withSession";
import Landing, { type LandingPartner, type Purchasable } from "@/components/marketing/Landing";
import ComingSoon from "@/components/marketing/ComingSoon";
import WorkspacePicker from "@/components/workspaces/WorkspacePicker";
import { waitlistMode } from "@/utils/waitlist";
import { robloxOAuthConfigured } from "@/utils/robloxOAuth";
import prisma from "@/utils/database";
import { isPlanPurchasable } from "@/utils/stripe";
import { roleOf } from "@/utils/hosts";

// Signed-out visitors see the public landing page; signed-in users see their workspaces.
export const getServerSideProps = withSessionSsr(async ({ req }) => {
  const signedIn = Boolean((req as any).session?.userid);
  // On a workspace's own domain the front door leads to that workspace and nothing else (proxy.ts sets this header).
  const customGroup = req.headers["x-rosterr-custom-group"];
  const customId = Array.isArray(customGroup) ? customGroup[0] : customGroup;
  if (customId && /^\d{1,12}$/.test(customId)) {
    if (!signedIn) return { redirect: { destination: "/login", permanent: false } };
    const member = await prisma.membership.findFirst({ where: { workspaceGroupId: BigInt(customId), userId: BigInt((req as any).session.userid) }, select: { userId: true } });
    if (member) return { redirect: { destination: `/workspace/${customId}`, permanent: false } };
    // No longer a member: end this sign-in so it can't loop, and say why.
    (req as any).session.destroy();
    return { redirect: { destination: "/login?error=not_member", permanent: false } };
  }
  // With separate addresses (see docs/domains.md) the marketing site never shows the app, and the app's front door is the sign-in page.
  const role = roleOf(req.headers.host);
  if (role === "app" && !signedIn) return { redirect: { destination: "/login", permanent: false } };
  // The groups Rosterr has marked as official partners, shown on the public page. Only needed by signed-out visitors.
  const showPublic = !signedIn || role === "site";
  const partners = showPublic
    ? (
        await prisma.workspace
          .findMany({ where: { badge: "PARTNER", suspendedAt: null }, orderBy: { groupName: "asc" }, take: 12, select: { groupId: true, groupName: true, groupLogo: true } })
          .catch(() => [])
      ).map((w) => ({ id: w.groupId.toString(), name: w.groupName ?? "Partner", logo: w.groupLogo ?? null }))
    : [];
  return {
    props: {
      signedIn: role === "site" ? false : signedIn,
      waitlist: waitlistMode(),
      roblox: robloxOAuthConfigured(),
      partners,
      siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "",
      purchasable: { PRO: isPlanPurchasable("PRO"), BUSINESS: isPlanPurchasable("BUSINESS") },
    },
  };
});

// While Rosterr is "coming soon", visitors see the waitlist page instead of the marketing site.
const Home: NextPage<{ signedIn: boolean; waitlist: boolean; roblox: boolean; partners: LandingPartner[]; siteUrl: string; purchasable: Purchasable }> = ({ signedIn, waitlist, roblox, partners, siteUrl, purchasable }) =>
  signedIn ? <WorkspacePicker /> : waitlist ? <ComingSoon robloxAvailable={roblox} /> : <Landing purchasable={purchasable} partners={partners} siteUrl={siteUrl} />;

export default Home;
