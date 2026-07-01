import { useMemo, useState, useEffect } from 'react';
import {
  BarChart as RechartsBar,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { BarData } from './types';
import { CHART_COLORS } from './types';

interface Props {
  data: BarData;
}

export default function BarChart({ data }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data.controls) {
      const init: Record<string, boolean> = {};
      data.controls.forEach(c => { if (c.type === 'toggle') init[c.name] = c.default as boolean; });
      setToggles(init);
    }
  }, [data.controls]);

  const chartData = useMemo(() => {
    const filtered = data.datasets.filter(() => {
      const ctrl = data.controls?.find(c => c.type === 'toggle');
      if (!ctrl) return true;
      return toggles[ctrl.name] ?? ctrl.default;
    });
    return data.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      filtered.forEach(ds => {
        point[ds.label] = ds.values[i] ?? 0;
      });
      return point;
    });
  }, [data, toggles]);

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
            <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.857em', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
      <ResponsiveContainer width="100%" height={400}>
        <RechartsBar data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-active)" />
          <XAxis dataKey="name" tick={{ fontSize: '0.786em', fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: '0.786em', fill: 'var(--text-faint)' }} />
          <Tooltip
            contentStyle={{ fontSize: '0.857em', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          />
          {visibleDatasets.length > 1 && <Legend wrapperStyle={{ color: 'var(--text-muted)' }} />}
          {visibleDatasets.map((ds, i) => (
            <Bar
              key={ds.label}
              dataKey={ds.label}
              fill={ds.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              radius={[3, 3, 0, 0]}
              maxBarSize={50}
            />
          ))}
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}
