import { retiredRoute } from "@/utils/http/retired";

// Birthdays belong to a workspace membership now.
export default retiredRoute("Use /api/workspace/{id}/birthday (membership scoped) instead.");
