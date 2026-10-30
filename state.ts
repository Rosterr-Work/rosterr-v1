import { atom } from "recoil";
import type { StaffRole } from "@prisma/client";
import type { SeasonInfo } from "@/utils/seasons";

// What the app keeps in memory for the signed-in person and the workspace they are looking at. Loaded by the layout and by
// pages/api/@me and /api/workspace/[id]; the server decides what they may do either way.

export type workspaceinfo = {
  groupId: number;
  groupThumbnail: string;
  groupName: string;
  ownerId?: number | null;
};

type Person = { userId: number; username: string; displayname: string; thumbnail: string };
type WhatTheyCanStart = { canMakeWorkspace: boolean; needsEarlyAccess?: boolean };

export type LoginState = Person & WhatTheyCanStart & { workspaces: workspaceinfo[]; isOwner: boolean };

export type DashboardTile = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number };

const signedOut: LoginState = { isOwner: false, workspaces: [], canMakeWorkspace: false, userId: 1, username: "", displayname: "", thumbnail: "" };

const loginState = atom<LoginState>({ key: "loginState", default: signedOut });

/**
 * The workspace id in the address (/workspace/<id>/...), until the workspace itself has loaded. 0 when the page wasn't opened on a
 * workspace address (the front page, which then moves on): nothing may ask the server about "workspace 1", which is somebody else's.
 */
const groupFromAddress = () => (typeof window !== "undefined" ? parseInt(window.location.pathname.split("/")[2]) || 0 : 0);

const workspacestate = atom({
  key: "workspacestate",
  default: {
    groupId: groupFromAddress(),
    groupThumbnail: "",
    groupName: "",
    yourPermission: [] as string[],
    isAdmin: false,
    ownerId: null as number | null,
    groupTheme: "",
    whiteLabel: false,
    /** The seasonal theme being shown (Halloween and so on), or null. */
    season: null as SeasonInfo | null,
    /** The plan the workspace is on right now (null until it has loaded). */
    plan: null as "FREE" | "PRO" | "BUSINESS" | null,
    roles: [] as StaffRole[],
    yourRole: "",
    settings: {
      // Which parts of the workspace are switched on before its own settings have loaded.
      sessionsEnabled: true,
      noticesEnabled: true,
      guidesEnabled: true,
      leaderboardEnabled: true,
      assistantEnabled: true,
      alliesEnabled: false,
      policiesEnabled: false,
      applicationsEnabled: false,
      moderationEnabled: false,
      recommendationsEnabled: false,
      // Home page layout.
      layout: undefined as DashboardTile[] | undefined,
      widgets: [] as string[],
      hideEmpty: [] as string[],
      bannerImage: null as string | null,
    },
  },
});

const createWorkspaceModalState = atom({ key: "createWorkspaceModalState", default: false });
const dashboardEditingState = atom({ key: "dashboardEditingState", default: false });

export { loginState, workspacestate, createWorkspaceModalState, dashboardEditingState };
