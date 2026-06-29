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
    <ResponsiveContainer width="100%" height={360}>
      <RechartsPie margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={130}
          innerRadius={50}
          paddingAngle={2}
          label
          labelLine
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={data.colors?.[i] ?? CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
}
