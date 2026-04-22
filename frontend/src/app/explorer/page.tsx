"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Table2, ChevronLeft, ChevronRight, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/api";
import api from "@/lib/api";

export default function ExplorerPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    api
      .get<AnalysisResult[]>("/api/analyses")
      .then((res) => {
        const completed = res.data.filter((a) => a.status === "completed");
        setAnalyses(completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = analyses.find((a) => a.id === selectedId);
  const tableData = useMemo(
    () => (selected?.raw_data_preview as Record<string, unknown>[]) || [],
    [selected]
  );

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]).map((key) => ({
      accessorKey: key,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {key}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const val = getValue();
        return <span className="max-w-[200px] truncate block">{String(val ?? "")}</span>;
      },
    }));
  }, [tableData]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
        <p className="text-muted-foreground">Browse and filter your analyzed data</p>
      </motion.div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : analyses.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Table2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No data to explore</h3>
            <p className="text-sm text-muted-foreground">
              Complete an analysis first to explore the data
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {analyses.map((a) => (
              <Button
                key={a.id}
                variant={a.id === selectedId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
              >
                {a.business_type || a.id.slice(0, 8)}
              </Button>
            ))}
          </div>

          {!selectedId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <MousePointerClick className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Select a File to Explore</h3>
                  <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                    Choose one of the analyzed files above to browse its data, sort columns, and
                    search across all fields.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="glass">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">
                  {selected?.business_type || "Data"} ({tableData.length} rows)
                </CardTitle>
                <input
                  type="text"
                  placeholder="Search all columns..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none"
                />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id} className="border-b bg-muted/50">
                          {hg.headers.map((header) => (
                            <th key={header.id} className="px-3 py-2 text-left font-medium">
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="border-b transition-colors hover:bg-muted/30">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-3 py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
