"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Lightbulb,
  Table2,
  Sprout,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getNavigationItems, isNavigationItemActive } from "@/lib/interface.mjs";

const icons = [LayoutDashboard, Upload, Lightbulb, Table2];
const navItems = getNavigationItems().map((item, index) => ({ ...item, icon: icons[index] }));

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="relative hidden h-dvh w-[76px] shrink-0 flex-col border-r bg-card md:flex xl:w-[248px]">
        <div className="flex h-[72px] items-center gap-3 px-4 xl:px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-base font-semibold tracking-[-0.025em]">SmartBiz</p>
            <p className="truncate text-xs text-muted-foreground">Ruang kerja bisnis</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const isActive = isNavigationItemActive(pathname, item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="xl:hidden">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="m-3 rounded-2xl bg-secondary p-3 xl:p-4">
          <CircleHelp className="h-5 w-5 text-primary" />
          <div className="mt-3 hidden xl:block">
            <p className="text-sm font-semibold">Butuh bantuan?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Gunakan asisten data di kanan bawah.
            </p>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
