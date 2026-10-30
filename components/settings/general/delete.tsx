import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";

// Deleting a workspace for good. The owner has to type its name first, so it can't happen by a stray click.

type Props = {
  workspaceId: number;
  workspaceName: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
};

export default function DeleteWorkspace({ isOpen, onClose, workspaceId, workspaceName, onSuccess }: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = typed === workspaceName;

  useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);

  if (!isOpen) return null;

  const remove = async () => {
    if (!matches) return toast.error("Workspace name does not match");
    setBusy(true);
    try {
      await axios.delete(`/api/workspace/${workspaceId}/settings/general/deletews`);
      toast.success("Workspace deleted successfully");
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete workspace");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" role="dialog" aria-modal="true" aria-labelledby="delete-workspace-title">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <IconAlertTriangle className="text-red-500" size={24} />
            <h2 id="delete-workspace-title" className="text-h3 text-gray-900 dark:text-white">
              Delete workspace
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <IconX size={20} />
          </button>
        </div>

        <div className="space-y-4 p-6 text-sm text-gray-600 dark:text-gray-400">
          <p>
            This is <strong>permanent and can't be undone</strong>. Everything in the workspace is removed: members, sessions, documents and settings.
          </p>
          <label className="block">
            <span className="mb-2 block font-medium text-gray-700 dark:text-gray-300">
              Type <span className="font-bold text-red-500">{workspaceName}</span> to confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Workspace name"
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-white ${
                matches ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-zinc-500 dark:border-zinc-600"
              }`}
            />
          </label>
        </div>

        <div className="flex gap-3 border-t border-gray-200 p-6 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-600 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={!matches || busy}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {busy ? "Deleting..." : "Delete workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
