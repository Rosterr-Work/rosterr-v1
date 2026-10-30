import { PrismaClient, StaffRole, Workspace, User, WorkspaceSession, SessionKind, SessionSchedule, PlaySession, StaffDocument, WallPost, LeaveNotice, SessionParticipant, ActivityQuota, Alliance, AllianceVisit, RoleAssignment } from "@prisma/client";

declare global {
    var prisma: PrismaClient;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') globalThis.prisma = prisma

// Middleware to hide passwordhash and tfa configurations from API responses

export type { StaffRole, Workspace, User, WorkspaceSession, SessionKind, SessionSchedule, PlaySession, StaffDocument, WallPost, LeaveNotice, SessionParticipant, ActivityQuota, Alliance, AllianceVisit, RoleAssignment };

// `StaffRole.permissions`/`StaffRole.groupRoles` are stored as JSON arrays (MySQL has
// no native array column type), so Prisma types them as the broad `Json`
// type. At runtime they're always `string[]`/`number[]` — this narrowed
// type is for client-side/UI code that already treats them as such.
export type UIRole = Omit<StaffRole, "permissions" | "groupRoles"> & {
    permissions: string[];
    groupRoles: number[];
};

export default prisma;