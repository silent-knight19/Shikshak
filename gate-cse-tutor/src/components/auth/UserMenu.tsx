import type { FC } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../firebase/auth';

const UserMenu: FC = () => {
  const { user, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
          border: '1px solid var(--border)', padding: 0, cursor: 'pointer',
          background: 'transparent', flexShrink: 0,
        }}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>
            {user.email?.[0].toUpperCase() ?? '?'}
          </div>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 8, minWidth: 180, zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{user.displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{user.email}</div>
          </div>
          <button
            onClick={() => { signOutUser(); setOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent',
              color: 'var(--status-error)', cursor: 'pointer', fontSize: 12,
              fontFamily: 'var(--font-sans)', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
