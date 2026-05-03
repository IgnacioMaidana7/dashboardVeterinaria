import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';

// Custom tick that splits text by " | " and renders each part on its own line
function MultiLineTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const parts = (payload?.value ?? '').split(' | ');
  const lineHeight = 15;
  return (
    <g transform={`translate(${x},${y})`}>
      {parts.map((part, i) => (
        <text
          key={i}
          x={0}
          y={0}
          dy={10 + i * lineHeight}
          textAnchor="middle"
          fill="var(--text-secondary)"
          fontSize={11}
          fontFamily="var(--font-body)"
        >
          {part}
        </text>
      ))}
    </g>
  );
}

interface GroupedBarChartProps {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  bars: { key: string; name: string; color: string }[];
  xAxisKey: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  /** Use multiline tick rendering for long labels that contain " | " */
  multilineTick?: boolean;
  height?: number;
  /** Position of the legend: 'bottom' (default) or 'top-right' */
  legendPosition?: 'bottom' | 'top-right';
  className?: string;
}

export function GroupedBarChart({
  title,
  subtitle,
  data,
  bars,
  xAxisKey,
  yAxisLabel,
  xAxisLabel,
  multilineTick = false,
  height = 300,
  legendPosition = 'bottom',
  className,
}: GroupedBarChartProps) {
  // Calculate extra bottom margin based on max number of lines in any label
  const maxLines = multilineTick
    ? Math.max(...data.map((d) => String(d[xAxisKey] ?? '').split(' | ').length))
    : 1;
  const bottomMargin = multilineTick ? 20 + maxLines * 16 + (xAxisLabel ? 24 : 0) : 5;

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          barGap={4}
          barCategoryGap="20%"
          margin={{ top: 5, right: 20, left: 20, bottom: bottomMargin }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tick={multilineTick ? MultiLineTick : { fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            interval={0}
            label={
              xAxisLabel
                ? { value: xAxisLabel, position: 'insideBottom', offset: -bottomMargin + 8, style: { fontSize: 13, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' } }
                : undefined
            }
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={false}
            tickLine={false}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--text-secondary)' } }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            verticalAlign={legendPosition === 'top-right' ? 'top' : 'bottom'}
            align={legendPosition === 'top-right' ? 'right' : 'center'}
            wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-body)', paddingBottom: legendPosition === 'top-right' ? 0 : 8 }}
          />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
