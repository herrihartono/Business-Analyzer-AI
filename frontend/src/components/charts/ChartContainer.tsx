"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartLineChart } from "./LineChart";
import { SmartBarChart } from "./BarChart";
import { SmartPieChart } from "./PieChart";
import { isCurrencyFieldName } from "@/lib/utils";

type ValueFormat = "currency" | "number";

interface ChartConfig {
  type: string;
  title: string;
  data: Record<string, unknown>[];
  xKey?: string;
  dataKeys?: string[];
  dataKey?: string;
  nameKey?: string;
  valueFormat?: ValueFormat;
}

interface Props {
  charts: ChartConfig[];
}

export function ChartContainer({ charts }: Props) {
  if (!charts || charts.length === 0) return null;

  const resolveValueFormat = (chart: ChartConfig): ValueFormat => {
    if (chart.valueFormat) return chart.valueFormat;

    const keys = [chart.title, ...(chart.dataKeys || []), chart.dataKey || ""];
    const hasCurrencySignal = keys.some((key) => isCurrencyFieldName(key));
    return hasCurrencySignal ? "currency" : "number";
  };

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
                  valueFormat={resolveValueFormat(chart)}
                />
              )}
              {chart.type === "bar" && (
                <SmartBarChart
                  data={chart.data}
                  xKey={chart.xKey || "name"}
                  dataKeys={chart.dataKeys || []}
                  valueFormat={resolveValueFormat(chart)}
                />
              )}
              {chart.type === "pie" && (
                <SmartPieChart
                  data={chart.data}
                  dataKey={chart.dataKey || "value"}
                  nameKey={chart.nameKey || "name"}
                  valueFormat={resolveValueFormat(chart)}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
