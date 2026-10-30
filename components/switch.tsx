import { Switch } from "@headlessui/react";

// An on/off switch with an optional label beside it. (`classoverride` is accepted for older callers and does nothing.)

type Props = {
  label: string;
  onChange?: () => void;
  classoverride?: string;
  disabled?: boolean;
  checked?: boolean;
};

export default function SwitchComponenet({ onChange, label, checked, disabled }: Props) {
  return (
    <div className="flex flex-row">
      <Switch
        checked={Boolean(checked)}
        onChange={() => onChange?.()}
        disabled={disabled}
        className={`${checked ? "bg-primary" : "bg-zinc-200"} relative mb-2 inline-flex h-6 w-11 items-center rounded-full shadow-inner disabled:opacity-60`}
      >
        <span className={`${checked ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white shadow transition`} />
      </Switch>
      {label && <p className="ml-2 dark:text-white">{label}</p>}
    </div>
  );
}
