"use client";

import { Select } from "@base-ui/react/select";
import { cn } from "@/lib/cn";
import { controlClass } from "./field";
import { Check, ChevronDown } from "./icons";

type Option<T extends string> = { value: T; label: string };

type SelectFieldProps<T extends string> = {
  label: string;
  name: string;
  items: Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
};

export function SelectField<T extends string>({
  label,
  name,
  items,
  value,
  onValueChange,
}: SelectFieldProps<T>) {
  return (
    <Select.Root
      items={items}
      name={name}
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
    >
      <div className="grid gap-1.5">
        <Select.Label className="text-sm font-medium text-neutral-900">{label}</Select.Label>
        <Select.Trigger
          className={cn(controlClass, "flex h-9 items-center justify-between text-left")}
        >
          <Select.Value />
          <Select.Icon className="text-neutral-500">
            <ChevronDown />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal>
        <Select.Positioner sideOffset={6} className="z-50 outline-none">
          <Select.Popup
            className={cn(
              "min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-xl bg-white p-1 shadow-popover outline-none",
              "transition-[opacity,scale] duration-[180ms] ease-out data-[ending-style]:duration-100",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-sm text-neutral-900 outline-none select-none data-[highlighted]:bg-black/[0.06]"
                >
                  <Select.ItemText className="flex-1">{item.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
