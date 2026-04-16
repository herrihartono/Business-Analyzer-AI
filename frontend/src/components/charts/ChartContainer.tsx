"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartLineChart } from "./LineChart";
import { SmartBarChart } from "./BarChart";
import { SmartPieChart } from "./PieChart";

interface ChartConfig {
  type: string;
  title: string;
  data: Record<string, unknown>[];
  xKey?: string;
  dataKeys?: string[];
  dataKey?: string;
  nameKey?: string;
}

interface Props {
  charts: ChartConfig[];
}

export function ChartContainer({ charts }: Props) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {charts.map((chart, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{chart.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {chart.type === "line" && (
                <SmartLineChart
                  data={chart.data}
                  xKey={chart.xKey || "index"}
                  dataKeys={chart.dataKeys || []}
                />
              )}
              {chart.type === "bar" && (
                <SmartBarChart
                  data={chart.data}
                  xKey={chart.xKey || "name"}
                  dataKeys={chart.dataKeys || []}
                />
              )}
              {chart.type === "pie" && (
                <SmartPieChart
                  data={chart.data}
                  dataKey={chart.dataKey || "value"}
                  nameKey={chart.nameKey || "name"}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
