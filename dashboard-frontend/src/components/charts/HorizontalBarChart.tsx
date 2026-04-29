import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { ChartCard } from './ChartCard';

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: { name: string; value: number; color?: string; pct?: number }[];
  showLabels?: boolean;
  valueFormatter?: (value: number, entry: any) => string;
  className?: string;
  xAxisLabel?: string;
}

const DEFAULT_COLORS = [
  '#1B3A4B',
  '#E8913A',
  '#2D8659',
  '#2980B9',
  '#1A6B7A',
  '#6C757D',
  '#C0392B',
];

export function HorizontalBarChart({
  title,
  subtitle,
  data,
  showLabels = true,
  valueFormatter,
  className,
  xAxisLabel,
}: HorizontalBarChartProps) {
  const sorted = [...data].sort((a, b) => a.value - b.value);

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted} layout="vertical" barCategoryGap="20%" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            label={
              xAxisLabel
                ? { value: xAxisLabel, position: 'insideBottom', offset: -2, style: { fontSize: 12, fill: 'var(--text-secondary)' } }
                : undefined
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            formatter={(value, name, props) => {
              const num = Number(value);
              const pct = (props as any)?.payload?.pct;
              if (pct !== undefined) {
                return [`${num} (${Number(pct).toFixed(1)}%)`, name];
              }
              return [num, name];
            }}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
            {showLabels && (
              <LabelList
                dataKey="value"
                position="right"
                formatter={((value: number, entry: any) => {
                  if (valueFormatter) return valueFormatter(value, entry);
                  const pct = entry?.pct;
                  return pct !== undefined ? `${value} (${Number(pct).toFixed(1)}%)` : `${value}`;
                }) as any}
                style={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-body)' }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
