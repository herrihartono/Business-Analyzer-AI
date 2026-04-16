"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <input
          type="text"
          placeholder="Search analyses..."
          className="w-64 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          H
        </div>
      </div>
    </header>
  );
}
