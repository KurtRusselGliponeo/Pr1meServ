'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface MetricDatum {
  label: string;
  value: number;
}

interface BaseMetricChartProps {
  data: MetricDatum[];
  colorClassName?: string;
  className?: string;
  formatValue?: (value: number) => string;
}

export function BarMetricChart({
  data,
  colorClassName = 'fill-primary',
  className,
  formatValue = (value) => value.toLocaleString(),
}: BaseMetricChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid h-56 grid-cols-[repeat(auto-fit,minmax(40px,1fr))] items-end gap-3 rounded-[28px] border border-white/50 bg-brand-gradient-soft p-5 shadow-soft dark:border-white/10">
        {data.map((item) => {
          const height = `${Math.max((item.value / maxValue) * 100, 8)}%`;

          return (
            <div key={item.label} className="flex h-full flex-col items-center justify-end gap-3">
              <span className="text-[11px] font-medium text-muted-foreground">
                {formatValue(item.value)}
              </span>
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className={cn(
                    'w-full rounded-t-[20px] bg-brand-gradient transition-all duration-500',
                    colorClassName,
                  )}
                  style={{ height }}
                  aria-label={`${item.label}: ${formatValue(item.value)}`}
                />
              </div>
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineMetricChart({
  data,
  className,
  formatValue = (value) => value.toLocaleString(),
}: BaseMetricChartProps) {
  const width = 560;
  const height = 220;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data
    .map((item, index) => {
      const x = index * stepX;
      const y = height - (item.value / maxValue) * (height - 24) - 12;

      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-[28px] border border-white/50 bg-brand-gradient-soft p-5 shadow-soft dark:border-white/10">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full overflow-visible">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            points={points}
            className="text-brand"
          />
          {data.map((item, index) => {
            const x = index * stepX;
            const y = height - (item.value / maxValue) * (height - 24) - 12;

            return (
              <g key={item.label}>
                <circle cx={x} cy={y} r="5" className="fill-brand" />
              </g>
            );
          })}
        </svg>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-2">
          {data.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/60 bg-background/90 px-3 py-2 text-center shadow-soft dark:border-white/10">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{formatValue(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
