import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';

interface DonutChartProps {
  title: string;
  subtitle?: string;
  data: { name: string; value: number; color?: string }[];
  className?: string;
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

export function DonutChart({
  title,
  subtitle,
  data,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div style={{ position: 'relative', width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const num = Number(value);
                const pct = total > 0 ? ((num / total) * 100).toFixed(1) : '0.0';
                return [`${num} (${pct}%)`, name];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value: string, entry: any) => (
                <span style={{ color: entry.color, fontSize: '12px', fontFamily: 'var(--font-body)' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
