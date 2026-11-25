"use client";

import { useState, useEffect, useMemo } from "react";
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
import { AlertCircle, ArrowUpDown, Table2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAnalyses, type AnalysisResult } from "@/lib/api";
import { formatTableValue } from "@/lib/utils";

export default function ExplorerPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [error, setError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    getAnalyses()
      .then((data) => {
        const completed = data.filter((a) => a.status === "completed");
        setAnalyses(completed);
        if (completed.length > 0) setSelectedId(completed[0].id);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [requestKey]);

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
        return <span className="max-w-[200px] truncate block">{formatTableValue(val, key)}</span>;
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
    <div className="page-shell min-w-0">
      <section className="page-heading">
        <div>
          <h1>Lihat data lebih dekat.</h1>
          <p>Cari nilai tertentu, urutkan kolom, dan periksa hasil normalisasi data.</p>
        </div>
      </section>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : error ? (
        <Card className="surface border-0 shadow-none">
          <CardContent className="empty-state">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold">Data belum dapat dimuat</h3>
            <p className="mt-1 text-sm text-muted-foreground">Periksa layanan API, lalu coba lagi.</p>
            <Button variant="outline" className="mt-5 gap-2 rounded-xl" onClick={() => { setError(false); setLoading(true); setRequestKey((key) => key + 1); }}>
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : analyses.length === 0 ? (
        <Card className="surface border-0 shadow-none">
          <CardContent className="empty-state">
            <Table2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Belum ada data untuk dijelajahi</h3>
            <p className="text-sm text-muted-foreground">
              Selesaikan satu analisis untuk melihat data di sini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {analyses.map((a) => (
              <Button
                key={a.id}
                variant={a.id === selectedId ? "default" : "outline"}
                size="sm"
                className="shrink-0 rounded-xl"
                onClick={() => setSelectedId(a.id)}
              >
                {a.business_type || a.id.slice(0, 8)}
              </Button>
            ))}
          </div>

          <Card className="surface min-w-0 border-0 shadow-none">
            <CardHeader className="flex flex-col items-stretch gap-3 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                {selected?.business_type || "Data"} ({tableData.length} baris)
              </CardTitle>
              <input
                type="text"
                placeholder="Cari di semua kolom..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none sm:w-64"
              />
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="max-w-full overflow-x-auto rounded-xl border">
                <table className="w-full min-w-max text-sm">
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

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}
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
        </>
      )}
    </div>
  );
}
