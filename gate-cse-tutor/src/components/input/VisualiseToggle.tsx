interface VisualiseToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function VisualiseToggle({ value, onChange }: VisualiseToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      title={value ? "Visualisation Mode: ON" : "Visualisation Mode: OFF"}
      style={{
        background: value ? 'rgba(138,180,248,0.15)' : 'transparent',
        border: 'none',
        color: value ? 'var(--accent-blue)' : 'var(--text-faint)',
        cursor: 'pointer',
        width: 34,
        height: 34,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = value ? 'rgba(138,180,248,0.25)' : 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = value ? 'var(--accent-blue)' : 'var(--text-muted)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = value ? 'rgba(138,180,248,0.15)' : 'transparent';
        e.currentTarget.style.color = value ? 'var(--accent-blue)' : 'var(--text-faint)';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    </button>
  );
}
