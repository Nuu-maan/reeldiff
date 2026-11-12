"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Card, Folder, Mark } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const links: {
  href: string;
  label: string;
  match: string[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { href: "/dashboard", label: "Projects", match: ["/dashboard", "/projects"], icon: Folder },
  { href: "/settings/billing", label: "Billing", match: ["/settings"], icon: Card },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex items-center justify-between gap-4 md:w-52 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-lg px-2 py-1 font-semibold text-neutral-900"
      >
        <Mark width={20} height={20} />
        <span className="max-sm:sr-only">Plot</span>
      </Link>
      <nav aria-label="Main" className="flex gap-1 md:flex-col">
        {links.map(({ href, label, match, icon: Icon }) => {
          const active = match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:shadow-focus",
                active
                  ? "bg-black/[0.06] text-neutral-900"
                  : "text-neutral-600 hover:bg-black/[0.04] hover:text-neutral-900",
              )}
            >
              <Icon className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
