import AuditLog from "@/components/audit/AuditLog";
import type { FC } from "@/types/settingsComponent";

// Settings > Audit logs. The screen itself is components/audit/AuditLog.tsx.
const AuditLogs: FC<{ triggerToast?: unknown }> = () => <AuditLog />;
AuditLogs.title = "Audit logs";
AuditLogs.description = "A record of who changed what in this workspace, and when.";

export default AuditLogs;
