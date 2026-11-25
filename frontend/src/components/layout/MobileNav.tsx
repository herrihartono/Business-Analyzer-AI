"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, Lightbulb, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavigationItems, isNavigationItemActive } from "@/lib/interface.mjs";

const icons = [LayoutDashboard, Upload, Lightbulb, Table2];
const items = getNavigationItems().map((item, index) => ({ ...item, icon: icons[index] }));

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama seluler"
      className="fixed inset-x-3 bottom-3 z-40 grid h-16 grid-cols-4 rounded-[22px] border bg-card/95 px-1 shadow-[0_12px_36px_rgba(24,32,30,0.16)] backdrop-blur md:hidden"
    >
      {items.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-[19px] w-[19px]", active && "stroke-[2.5]")} />
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
