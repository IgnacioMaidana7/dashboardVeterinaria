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

interface GroupedBarChartProps {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  bars: { key: string; name: string; color: string }[];
  xAxisKey: string;
  yAxisLabel?: string;
  className?: string;
}

export function GroupedBarChart({
  title,
  subtitle,
  data,
  bars,
  xAxisKey,
  yAxisLabel,
  className,
}: GroupedBarChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
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
            wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}
          />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
