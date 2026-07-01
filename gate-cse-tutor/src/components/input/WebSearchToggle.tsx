interface WebSearchToggleProps {
  active: boolean;
  onToggle: (v: boolean) => void;
}

export default function WebSearchToggle({ active, onToggle }: WebSearchToggleProps) {
  return (
    <button
      onClick={() => onToggle(!active)}
      title={active ? "Web Search: ON" : "Web Search: OFF"}
      style={{
        background: active ? 'rgba(138,180,248,0.15)' : 'transparent',
        border: 'none',
        color: active ? 'var(--accent-blue)' : 'var(--text-faint)',
        cursor: 'pointer',
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = active ? 'rgba(138,180,248,0.25)' : 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = active ? 'var(--accent-blue)' : 'var(--text-muted)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? 'rgba(138,180,248,0.15)' : 'transparent';
        e.currentTarget.style.color = active ? 'var(--accent-blue)' : 'var(--text-faint)';
      }}
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
  );
}
