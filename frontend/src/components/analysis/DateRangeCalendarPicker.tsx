"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DateRangeCalendarPickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (range: { start: string; end: string }) => void;
  defaultMonthDate?: string; // YYYY-MM-DD to focus initial view
  className?: string;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function DateRangeCalendarPicker({
  startDate,
  endDate,
  onChange,
  defaultMonthDate,
  className = "",
}: DateRangeCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial focus month/year
  const initialDate = useMemo(() => {
    if (startDate) return new Date(startDate);
    if (defaultMonthDate) return new Date(defaultMonthDate);
    return new Date();
  }, [startDate, defaultMonthDate]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Interactive selection state
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string>("");
  const [selectingEnd, setSelectingEnd] = useState<boolean>(false);

  // Sync with outer props when opened
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setSelectingEnd(false);
      setHoverDate("");
      if (startDate) {
        const d = new Date(startDate);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      } else if (defaultMonthDate) {
        const d = new Date(defaultMonthDate);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [isOpen, startDate, endDate, defaultMonthDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Navigate months
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate days in view month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Empty leading padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dateStr: "", dayNum: 0, isCurrentMonth: false });
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Day click handler
  const handleDayClick = (dateStr: string) => {
    if (!dateStr) return;

    if (!selectingEnd || (tempStart && tempEnd)) {
      // Step 1: select start date
      setTempStart(dateStr);
      setTempEnd("");
      setSelectingEnd(true);
    } else {
      // Step 2: select end date
      if (dateStr < tempStart) {
        // Clicked date is earlier: swap to new start date
        setTempStart(dateStr);
        setTempEnd("");
        setSelectingEnd(true);
      } else {
        setTempEnd(dateStr);
        setSelectingEnd(false);
        // Automatically apply selection
        onChange({ start: tempStart, end: dateStr });
        setIsOpen(false);
      }
    }
  };

  // Format date for display
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return "";
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const mIdx = parseInt(parts[1], 10) - 1;
        const year = parts[0];
        return `${day} ${MONTH_NAMES[mIdx]?.slice(0, 3)} ${year}`;
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempStart("");
    setTempEnd("");
    setSelectingEnd(false);
    onChange({ start: "", end: "" });
  };

  const handleApply = () => {
    if (tempStart) {
      const finalEnd = tempEnd || tempStart;
      onChange({ start: tempStart, end: finalEnd });
    } else {
      onChange({ start: "", end: "" });
    }
    setIsOpen(false);
  };

  // Quick preset ranges
  const applyPreset = (preset: "today" | "last7" | "last30" | "dataApril2026" | "all") => {
    if (preset === "all") {
      handleClear();
      setIsOpen(false);
      return;
    }

    if (preset === "dataApril2026") {
      onChange({ start: "2026-04-01", end: "2026-04-30" });
      setViewYear(2026);
      setViewMonth(3); // April is index 3
      setIsOpen(false);
      return;
    }

    const today = new Date();
    const endStr = today.toISOString().split("T")[0];

    if (preset === "today") {
      onChange({ start: endStr, end: endStr });
    } else if (preset === "last7") {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      onChange({ start: past.toISOString().split("T")[0], end: endStr });
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      onChange({ start: past.toISOString().split("T")[0], end: endStr });
    }
    setIsOpen(false);
  };

  // Trigger button label
  const triggerLabel = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDisplayDate(startDate);
      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
    }
    if (startDate) return `Mulai: ${formatDisplayDate(startDate)}`;
    if (endDate) return `Sampai: ${formatDisplayDate(endDate)}`;
    return "Pilih Rentang Tanggal";
  }, [startDate, endDate]);

  const hasSelection = Boolean(startDate || endDate);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Responsive Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full sm:w-auto min-w-[200px] h-10 flex items-center justify-between gap-2 px-3 rounded-lg border text-xs sm:text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-ring ${
          hasSelection
            ? "border-primary/50 bg-primary/5 text-foreground font-medium"
            : "border-input bg-background/80 text-muted-foreground hover:bg-background"
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <CalendarIcon className={`h-4 w-4 shrink-0 ${hasSelection ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate">{triggerLabel}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {hasSelection && (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Hapus rentang tanggal"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:left-auto right-auto z-50 w-[300px] sm:w-[330px] rounded-xl border border-border bg-popover/95 backdrop-blur-md p-3.5 shadow-xl animate-in fade-in-0 zoom-in-95">
          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-border/50 text-xs">
            <button
              type="button"
              onClick={() => applyPreset("dataApril2026")}
              className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              Apr 2026 (Data)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last7")}
              className="px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last30")}
              className="px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              Semua
            </button>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-sm font-semibold tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((name, i) => (
              <span
                key={name}
                className={`text-[11px] font-medium py-1 ${
                  i === 0 ? "text-destructive/80" : "text-muted-foreground"
                }`}
              >
                {name}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
            {calendarDays.map((item, index) => {
              if (!item.isCurrentMonth) {
                return <div key={`empty-${index}`} className="h-8 w-8" />;
              }

              const d = item.dateStr;
              const isStart = tempStart === d;
              const isEnd = tempEnd === d;
              const isRangeMid =
                tempStart &&
                tempEnd &&
                d > tempStart &&
                d < tempEnd;

              // Hover effect when selecting end date
              const isHoverRange =
                selectingEnd &&
                tempStart &&
                !tempEnd &&
                hoverDate &&
                d > tempStart &&
                d <= hoverDate;

              return (
                <div
                  key={d}
                  className={`h-8 flex items-center justify-center relative ${
                    isRangeMid || isHoverRange ? "bg-primary/15" : ""
                  } ${isStart && (tempEnd || hoverDate > d) ? "rounded-l-lg bg-primary/15" : ""} ${
                    isEnd ? "rounded-r-lg bg-primary/15" : ""
                  }`}
                  onMouseEnter={() => selectingEnd && setHoverDate(d)}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(d)}
                    className={`h-7 w-7 text-xs flex items-center justify-center rounded-lg transition-all ${
                      isStart || isEnd
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : isRangeMid || isHoverRange
                        ? "text-primary font-medium hover:bg-primary/25"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.dayNum}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selection Hint & Footer */}
          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[170px]">
              {selectingEnd
                ? "Pilih tanggal akhir..."
                : tempStart && tempEnd
                ? `${formatDisplayDate(tempStart)} - ${formatDisplayDate(tempEnd)}`
                : tempStart
                ? `Mulai: ${formatDisplayDate(tempStart)}`
                : "Klik tanggal mulai"}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempStart}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <Check className="h-3 w-3" />
                Pilih
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
