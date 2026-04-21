'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

interface MetricDatum {
  label: string;
  value: number;
}

interface BaseMetricChartProps {
  data: MetricDatum[];
  className?: string;
  formatValue?: (value: number) => string;
}

const CHART_SURFACE_CLASS =
  'rounded-[28px] border border-white/50 bg-brand-gradient-soft p-5 shadow-soft dark:border-white/10';

function resolveChartToken(
  token: '--brand' | '--brand-2' | '--muted-foreground' | '--border',
) {
  return `hsl(var(${token}))`;
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length || typeof payload[0]?.value !== 'number') {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/50 bg-background/95 px-3 py-2 text-sm shadow-soft dark:border-white/10">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{formatValue(payload[0].value)}</p>
    </div>
  );
}

export function BarMetricChart({
  data,
  className,
  formatValue = (value) => value.toLocaleString(),
}: BaseMetricChartProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className={CHART_SURFACE_CLASS}>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={resolveChartToken('--border')} opacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fill: resolveChartToken('--muted-foreground'), fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: resolveChartToken('--muted-foreground'), fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={78}
                tickFormatter={(value) => formatValue(Number(value))}
              />
              <Tooltip content={<ChartTooltipContent formatValue={formatValue} />} />
              <Bar
                dataKey="value"
                radius={[18, 18, 6, 6]}
                fill={resolveChartToken('--brand-2')}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function LineMetricChart({
  data,
  className,
  formatValue = (value) => value.toLocaleString(),
}: BaseMetricChartProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className={CHART_SURFACE_CLASS}>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={resolveChartToken('--border')} opacity={0.35} />
              <XAxis
                dataKey="label"
                tick={{ fill: resolveChartToken('--muted-foreground'), fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: resolveChartToken('--muted-foreground'), fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={78}
                tickFormatter={(value) => formatValue(Number(value))}
              />
              <Tooltip content={<ChartTooltipContent formatValue={formatValue} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={resolveChartToken('--brand')}
                strokeWidth={3}
                dot={{ r: 4, fill: resolveChartToken('--brand-2'), strokeWidth: 0 }}
                activeDot={{ r: 6, fill: resolveChartToken('--brand') }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
