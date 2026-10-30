// What the signed-in session cookie carries (see lib/withSession.ts). The rest of its fields are declared in types/next.d.ts.
import "iron-session";

declare module "iron-session" {
  interface IronSessionData {
    /** Someone part-way through proving a Roblox account is theirs. */
    verification?: { verificationCode: string; userid: number; isReset?: boolean };
    userid: number;
  }
}

export type User = { userId: number; isOwner?: boolean; username: string; displayname: string; thumbnail: string };
