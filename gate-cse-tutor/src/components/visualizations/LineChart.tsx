import { useMemo, useState, useEffect } from 'react';
import {
  LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { LineData } from './types';
import { CHART_COLORS } from './types';

interface Props {
  data: LineData;
}

export default function LineChart({ data }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data.controls) {
      const init: Record<string, boolean> = {};
      data.controls.forEach(c => { if (c.type === 'toggle') init[c.name] = c.default as boolean; });
      setToggles(init);
    }
  }, [data.controls]);

  const chartData = useMemo(() =>
    data.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      data.datasets.forEach(ds => {
        point[ds.label] = ds.values[i] ?? 0;
      });
      return point;
    }),
  [data]);

  const visibleDatasets = data.datasets.filter(() => {
    const ctrl = data.controls?.find(c => c.type === 'toggle');
    if (!ctrl) return true;
    return toggles[ctrl.name] ?? ctrl.default;
  });

  return (
    <div>
      {data.controls && data.controls.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {data.controls.map(c => c.type === 'toggle' && (
            <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={toggles[c.name] ?? c.default as boolean}
                onChange={e => setToggles(prev => ({ ...prev, [c.name]: e.target.checked }))}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={360}>
        <RechartsLine data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#555' }} />
          <YAxis tick={{ fontSize: 11, fill: '#888' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
          />
          <Legend />
          {visibleDatasets.map((ds, i) => (
            <Line
              key={ds.label}
              type="monotone"
              dataKey={ds.label}
              stroke={ds.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: ds.color ?? CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 1.5, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}
