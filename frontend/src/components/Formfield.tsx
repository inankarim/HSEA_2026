import type { ReactNode } from "react";

export default function FormField({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wide text-navy-deep/70"
      >
        <span>
          {label}
          {required && <span className="ml-1 text-accent-cyan">*</span>}
        </span>
        {hint && <span className="text-[11px] font-medium normal-case text-navy-deep/40">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClasses =
  "w-full rounded-lg border border-navy-deep/15 bg-white px-4 py-2.5 text-sm text-navy-deep placeholder:text-navy-deep/30 focus:border-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan/30 transition-colors";

export const textareaClasses = inputClasses + " resize-y min-h-[120px] leading-relaxed";