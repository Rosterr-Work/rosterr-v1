import { IconCopy } from "@tabler/icons-react";
import { Fold } from "@/components/ui/parts";

// Where the public API lives and how to call it.

export function ApiDocumentation({ triggerToast }: { triggerToast: { success: (message: string) => unknown } }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async () => {
    await navigator.clipboard.writeText(baseUrl);
    triggerToast.success("Copied to clipboard");
  };

  return (
    <Fold title="How to call the API" hint="Send requests to your workspace with one of the keys above.">
      <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Base URL</p>
      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">{baseUrl}</code>
        <button type="button" onClick={copy} aria-label="Copy the base URL" className="shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white">
          <IconCopy size={16} />
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        Send requests to <code className="break-all text-zinc-700 dark:text-zinc-300">{baseUrl}/api/public/v1/...</code> with an{" "}
        <code className="text-zinc-700 dark:text-zinc-300">Authorization: Bearer</code> header that holds your key.
      </p>
    </Fold>
  );
}

ApiDocumentation.title = "API documentation";
ApiDocumentation.description = "The base URL and how to send a key with each request.";
