"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import { useDashboard } from "@/hooks/useAnalysis";

export default function DashboardPage() {
  const { data, loading } = useDashboard();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">AI-powered business intelligence at a glance</p>
        </div>
        <Link href="/upload">
          <Button size="lg" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Files
          </Button>
        </Link>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data ? (
        <>
          <QuickStats
            totalUploads={data.total_uploads}
            totalAnalyses={data.total_analyses}
            businessTypes={data.business_type_counts}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Recent Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAnalyses analyses={data.recent_analyses} />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Business Types</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.business_type_counts).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(data.business_type_counts).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type}</span>
                        <span className="text-sm font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data yet. Upload files to begin analyzing.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Welcome to SmartBiz Analyzer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your business data files to get AI-powered insights
            </p>
            <Link href="/upload" className="mt-4">
              <Button>Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
