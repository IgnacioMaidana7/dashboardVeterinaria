import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';

interface HistogramChartProps {
  title: string;
  subtitle?: string;
  data: { bin: string; count: number }[];
  mean?: number;
  median?: number;
  className?: string;
}

export function HistogramChart({
  title,
  subtitle,
  data,
  mean,
  median,
  className,
}: HistogramChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="10%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
            label={{ value: 'Número de integrantes', position: 'insideBottom', offset: -2, style: { fontSize: 12, fill: 'var(--text-secondary)' } }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Frecuencia (hogares)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--text-secondary)' } }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value)} hogares`, 'Frecuencia']}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
            }}
          />
          <Bar dataKey="count" fill="#1B3A4B" radius={[4, 4, 0, 0]} />
          {mean !== undefined && median !== undefined && Math.abs(mean - median) > 0.5 && (
            <>
              <ReferenceLine
                x={String(Math.round(mean))}
                stroke="#C0392B"
                strokeDasharray="6 4"
                label={{
                  value: `Media: ${mean.toFixed(2)}`,
                  position: 'top',
                  fill: '#C0392B',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <ReferenceLine
                x={String(Math.round(median))}
                stroke="#E8913A"
                strokeDasharray="4 4"
                label={{
                  value: `Mediana: ${median}`,
                  position: 'insideTopRight',
                  fill: '#E8913A',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            </>
          )}
          {mean !== undefined && (median === undefined || Math.abs(mean - median) <= 0.5) && (
            <ReferenceLine
              x={String(Math.round(mean))}
              stroke="#1B3A4B"
              strokeDasharray="6 4"
              label={{
                value: `Media: ${mean.toFixed(2)}`,
                position: 'top',
                fill: '#1B3A4B',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
