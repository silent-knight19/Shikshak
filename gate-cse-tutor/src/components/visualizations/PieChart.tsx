import { useMemo } from 'react';
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { PieData } from './types';
import { CHART_COLORS } from './types';

interface Props {
  data: PieData;
}

export default function PieChart({ data }: Props) {
  const chartData = useMemo(() =>
    data.labels.map((label, i) => ({
      name: label,
      value: typeof data.values[i] === 'number' && isFinite(data.values[i]) ? Math.max(data.values[i], 0) : 0,
    })),
  [data]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsPie margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={140}
          innerRadius={55}
          paddingAngle={2}
          label
          labelLine
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={data.colors?.[i] ?? CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--bg-surface)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: '0.857em', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        />
        <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
