"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Lightbulb,
  Table2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Center", icon: Upload },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/explorer", label: "Data Explorer", icon: Table2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-screen flex-col border-r bg-card"
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <Brain className="h-7 w-7 shrink-0 text-primary" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold tracking-tight"
            >
              SmartBiz
            </motion.span>
          )}
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>

        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
