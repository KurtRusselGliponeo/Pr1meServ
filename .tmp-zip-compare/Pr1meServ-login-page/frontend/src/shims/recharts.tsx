import * as React from 'react';

type BaseChartProps = React.PropsWithChildren<{
  className?: string;
  width?: number | string;
  height?: number | string;
  data?: unknown[];
  margin?: Record<string, number>;
}>;

type AxisProps = {
  dataKey?: string;
  tick?: Record<string, string | number>;
  axisLine?: boolean;
  tickLine?: boolean;
  width?: number;
  tickFormatter?: (value: unknown) => string;
};

type SeriesProps = {
  dataKey?: string;
  radius?: number[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  type?: string;
  dot?: Record<string, unknown> | boolean;
  activeDot?: Record<string, unknown> | boolean;
};

type GridProps = {
  strokeDasharray?: string;
  stroke?: string;
  opacity?: number;
};

type TooltipProps = {
  content?: React.ReactNode;
};

function passthroughComponent<TProps extends object = Record<string, never>>(
  displayName: string,
  render?: (props: React.PropsWithChildren<TProps>) => React.ReactElement | null,
) {
  const Component = (props: React.PropsWithChildren<TProps>) =>
    render ? render(props) : <>{props.children}</>;
  Component.displayName = displayName;
  return Component;
}

export const ResponsiveContainer = passthroughComponent<BaseChartProps>(
  'ResponsiveContainer',
  ({ children, className }) => <div className={className}>{children}</div>,
);

export const BarChart = passthroughComponent<BaseChartProps>('BarChart');
export const LineChart = passthroughComponent<BaseChartProps>('LineChart');
export const CartesianGrid = passthroughComponent<GridProps>('CartesianGrid', () => null);
export const XAxis = passthroughComponent<AxisProps>('XAxis', () => null);
export const YAxis = passthroughComponent<AxisProps>('YAxis', () => null);
export const Tooltip = passthroughComponent<TooltipProps>('Tooltip', () => null);
export const Bar = passthroughComponent<SeriesProps>('Bar', () => null);
export const Line = passthroughComponent<SeriesProps>('Line', () => null);
