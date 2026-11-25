import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ChatDrawer } from "@/components/analysis/ChatDrawer";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "SmartBiz Analyzer",
  description: "AI-powered business analysis platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={manrope.className}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex h-dvh overflow-hidden">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
            <MobileNav />
            <ChatDrawer />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
