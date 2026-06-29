import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import type { Settings } from '../../store/types';
import { DEFAULT_SETTINGS } from '../../store/types';

interface SettingsModalProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const MODELS = [
  { id: 'gemma-4-31b-it', label: 'Gemma 4 31B IT' },
];

const TEMPS = [0, 0.3, 0.5, 0.7, 0.9, 1.0];

const SettingsModal: FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [local, setLocal] = useState<Settings>({ ...settings });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: 440, maxHeight: '80vh',
        overflow: 'auto', padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <label style={labelStyle}>Model</label>
        <select
          value={local.model}
          onChange={e => setLocal({ ...local, model: e.target.value })}
          style={{ ...inputStyle, marginBottom: 16 }}
        >
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        <label style={labelStyle}>Temperature: {local.temperature}</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TEMPS.map(t => (
            <button
              key={t}
              onClick={() => setLocal({ ...local, temperature: t })}
              style={{
                ...btnSmall, flex: 1,
                background: local.temperature === t ? 'var(--accent-blue)' : 'var(--bg-surface)',
                color: local.temperature === t ? '#fff' : 'var(--text-muted)',
                borderColor: local.temperature === t ? 'var(--accent-blue)' : 'var(--border)',
              }}
            >{t}</button>
          ))}
        </div>

        <label style={labelStyle}>Thinking Level</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['off', 'low', 'medium', 'high'] as const).map(level => (
            <button
              key={level}
              onClick={() => setLocal({ ...local, thinkingLevel: level })}
              style={{
                ...btnSmall, flex: 1, textTransform: 'capitalize',
                background: local.thinkingLevel === level ? 'var(--accent-blue)' : 'var(--bg-surface)',
                color: local.thinkingLevel === level ? '#fff' : 'var(--text-muted)',
                borderColor: local.thinkingLevel === level ? 'var(--accent-blue)' : 'var(--border)',
              }}
            >{level}</button>
          ))}
        </div>

        <label style={labelStyle}>Visualise Mode</label>
        <button
          onClick={() => setLocal({ ...local, visualiseMode: !local.visualiseMode })}
          style={{
            ...btnSmall, width: '100%', marginBottom: 20,
            background: local.visualiseMode ? 'rgba(138,180,248,0.12)' : 'var(--bg-surface)',
            color: local.visualiseMode ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderColor: local.visualiseMode ? 'rgba(138,180,248,0.4)' : 'var(--border)',
          }}
        >{local.visualiseMode ? 'On' : 'Off'}</button>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setLocal({ ...DEFAULT_SETTINGS })} style={{ ...btnSmall, color: 'var(--text-muted)' }}>Reset</button>
          <button onClick={() => onSave(local)} style={{
            ...btnSmall, background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)', padding: '6px 16px',
          }}>Save</button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
};
const btnSmall: React.CSSProperties = {
  padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
  transition: 'all 0.12s',
};

export default SettingsModal;
