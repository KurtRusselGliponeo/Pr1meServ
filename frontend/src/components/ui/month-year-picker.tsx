'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  className?: string;
  startYear?: number;
  endYear?: number;
}

const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function MonthYearPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
  className,
  startYear = new Date().getFullYear() - 5,
  endYear = new Date().getFullYear() + 1,
}: MonthYearPickerProps) {
  const years = React.useMemo(() => {
    const values: number[] = [];

    for (let current = endYear; current >= startYear; current -= 1) {
      values.push(current);
    }

    return values;
  }, [endYear, startYear]);

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Month
        </span>
        <select
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
          className="min-h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          {monthLabels.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Year
        </span>
        <select
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className="min-h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
