import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-300",
  secondary:
    "bg-control text-neutral-900 hover:bg-control-hover disabled:bg-surface disabled:text-neutral-400",
  ghost: "text-neutral-700 hover:bg-black/[0.06] disabled:text-neutral-400",
};

export const buttonClass = (variant: keyof typeof variants = "primary", className?: string) =>
  cn(
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium",
    "outline-none transition-[background-color,color,box-shadow,scale] duration-150 ease-out",
    "focus-visible:shadow-focus active:scale-[0.96] disabled:pointer-events-none",
    variants[variant],
    className,
  );

type ButtonProps = ComponentProps<"button"> & { variant?: keyof typeof variants };

export function Button({ variant, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
