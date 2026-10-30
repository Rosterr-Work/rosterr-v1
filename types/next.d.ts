import { IronSession } from "iron-session";

interface SessionExtras {
  userid?: number;
  /** This sign-in's row in the list of devices (utils/sessions/devices.ts). */
  sid?: string;
  /** When the sign-in was last renewed (lib/sessionLifetime.ts). */
  refreshedAt?: number;
  oauthState?: string;
  pendingDiscord?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    email: string | null;
  };
  // Signed in with Roblox OAuth but no Discord account is linked yet (the symmetric counterpart of
  // pendingDiscord) — set by pages/api/auth/roblox/callback.ts, cleared once Discord linking finishes.
  pendingRoblox?: {
    userid: number;
    username: string;
    displayName: string;
    picture: string | null;
  };
  // The PKCE verifier for an in-flight Roblox OAuth attempt (Roblox requires PKCE) — set by
  // pages/api/auth/roblox/start.ts, consumed and cleared by its callback.
  robloxCodeVerifier?: string;
  // Set while a platform admin is working inside an organisation (see utils/platform/support.ts).
  platformAccess?: import("@/utils/platform/support").SupportAccess;
  // Last successful Discord server/role check for the platform portal (see utils/platform/access.ts).
  platformGate?: { discordId: string; at: number };
  // Platform staff re-confirm it is really them (a code sent to their Discord DMs) before billing and approvals; good for 10 minutes.
  platformStepUp?: { at: number };
  platformStepUpChallenge?: { hash: string; expires: number; tries: number; sentAt: number };
  // A social media account being linked from the Platform portal (utils/social/service.ts): the state and PKCE verifier to check on return.
  socialOAuth?: import("@/utils/social/service").OAuthAttempt;
  // A one-time ticket to download the user export (pages/api/platform/users/export.ts), good for 2 minutes.
  userExport?: { hash: string; expires: number; emailableOnly: boolean };
  verification?: {
    userid: number;
    verificationCode: string;
    isReset?: boolean;
  };
}

declare module "next" {
  interface NextApiRequest {
    session: IronSession & SessionExtras;
  }
}

declare module "http" {
  interface IncomingMessage {
    session?: IronSession & SessionExtras;
  }
}