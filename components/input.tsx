import { forwardRef } from "react";
import { useFormContext, type UseFormRegister } from "react-hook-form";

// A labelled text field (or textarea) that plugs into react-hook-form: spread `register("name")` onto it and any validation message for
// that field shows underneath. `prepend` and `append` are fixed bits of text at the field's ends, such as "https://".

type Wording = { label?: string; placeholder?: string; prepend?: string; append?: string };
type Behaviour = { register?: UseFormRegister<any>; disabled?: boolean; textarea?: boolean; type?: string; value?: string; id?: string };

type Props = Wording & Behaviour & { classoverride?: string };

const FIELD = "w-full border-2 border-gray-300 bg-zinc-50 p-2 text-zinc-600 focus-visible:outline-none dark:border-zinc-500 dark:bg-zinc-700 dark:text-white";
const ADDON = "flex items-center border-2 border-grey-light bg-grey-lighter px-3 text-sm text-grey-dark dark:text-white";

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props & ReturnType<UseFormRegister<any>>>(function Input(
  { placeholder, label, classoverride = "", id, onChange, onBlur, name, type, textarea, append, prepend, disabled, value },
  ref
) {
  const errors = (useFormContext()?.formState?.errors ?? {}) as Record<string, { message?: string } | undefined>;
  const error = errors[name]?.message;
  const shared = { id, name, placeholder, onChange, onBlur, value, ref: ref as any };

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="text-sm text-zinc-500 dark:text-zinc-200">
          {label}
        </label>
      )}

      {textarea ? (
        <textarea
          {...shared}
          className={`${FIELD} rounded-lg ${errors[name] ? "focus-visible:border-red-500 focus-visible:ring-red-500" : "focus-visible:border-blue-500 focus-visible:ring-blue-500"} ${classoverride}`}
        />
      ) : (
        <div className="relative mb-0 flex w-full flex-wrap items-stretch">
          {prepend && <span className={`${ADDON} -ml-px rounded-lg rounded-r-none border-r-0`}>{prepend}</span>}
          <input
            {...shared}
            type={type}
            disabled={disabled}
            className={`${FIELD} block flex-1 rounded-lg border px-3 py-2 transition focus:border-primary focus:ring-primary disabled:bg-zinc-200 ${prepend ? "rounded-l-none" : ""} ${append ? "rounded-r-none" : ""} ${classoverride}`}
          />
          {append && <span className={`${ADDON} -mr-px rounded-lg rounded-l-none border-l-0`}>{append}</span>}
        </div>
      )}

      {error && <p className="-mb-7 mt-1 block h-10 text-red-500">{error}</p>}
    </div>
  );
});

export default Input;
