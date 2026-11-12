import { type ComponentProps, useId } from "react";
import { cn } from "@/lib/cn";

export const controlClass = cn(
  "w-full rounded-xl bg-white px-3 text-base text-neutral-900 shadow-raised outline-none sm:text-sm",
  "placeholder:text-neutral-400 transition-shadow duration-150 ease-out",
  "focus-visible:shadow-[var(--shadow-raised),var(--shadow-focus)]",
);

type FieldProps = { label: string; className?: string };

export function TextField({ label, className, ...props }: FieldProps & ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input id={id} className={cn(controlClass, "h-9")} {...props} />
    </div>
  );
}

export function TextAreaField({
  label,
  className,
  ...props
}: FieldProps & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <textarea id={id} rows={3} className={cn(controlClass, "resize-none py-2")} {...props} />
    </div>
  );
}
