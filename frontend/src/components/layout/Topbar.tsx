"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { getPageMeta } from "@/lib/interface.mjs";

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const pageMeta = getPageMeta(pathname);

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:hidden">
          <Sprout className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{pageMeta.title}</p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{pageMeta.description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ganti tema warna"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-xl"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-label="Profil H">
          H
        </div>
      </div>
    </header>
  );
}
