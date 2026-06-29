import type { FC } from 'react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Conversation } from '../../store/types';

import ContextWindow from './ContextWindow';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNewChat: () => void;
  contextUsed: number;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const STORAGE_WIDTH_KEY = 'gate-tutor-sidebar-width';
const STORAGE_COLLAPSED_KEY = 'gate-tutor-sidebar-collapsed';

function loadWidth(): number {
  try { return Number(localStorage.getItem(STORAGE_WIDTH_KEY)) || 300; } catch { return 300; }
}
function saveWidth(w: number) { localStorage.setItem(STORAGE_WIDTH_KEY, String(w)); }
function loadCollapsed(): boolean {
  try { return localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true'; } catch { return false; }
}
function saveCollapsed(c: boolean) { localStorage.setItem(STORAGE_COLLAPSED_KEY, String(c)); }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const Sidebar: FC<SidebarProps> = ({ conversations, activeId, loading, onSelect, onDelete, onRename, onNewChat, contextUsed }) => {
  const [width, setWidth] = useState(loadWidth);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  

  const sorted = useMemo(() => {
    const list = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  useEffect(() => { saveWidth(width); }, [width]);
  useEffect(() => { saveCollapsed(collapsed); }, [collapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { renameRef.current?.focus(); renameRef.current?.select(); }, [renamingId]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startW = width;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + ev.clientX - startX));
      setWidth(newW);
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameText(currentTitle);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      onRename(renamingId, renameText.trim());
    }
    setRenamingId(null);
    setRenameText('');
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setRenamingId(null);
  };

  if (collapsed) {
    return (
      <div
        onMouseDown={startResize}
        style={{
          width: 0,
          height: '100%',
          flexShrink: 0,
          overflow: 'visible',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{
            position: 'absolute',
            top: 12,
            left: 8,
            width: 28,
            height: 40,
            borderRadius: '0 8px 8px 0',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderLeft: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height: '100%',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
        transition: dragging.current ? 'none' : 'width 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 12px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 10px 8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>⌘K</span>
        </div>
      </div>

      {/* New Chat button */}
      <div style={{ padding: '0 10px 10px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-active)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Chat
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 14px' }} />

      {/* Chat list header */}
      <div style={{
        padding: '8px 18px 4px',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--text-faint)',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Chats</span>
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{sorted.length}</span>
      </div>

      {/* Chat list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {loading ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>Loading...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-faint)', fontSize: 12, marginBottom: 6 }}>
              {search ? 'No results' : 'No chats yet'}
            </div>
            {!search && (
              <button onClick={onNewChat} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 12, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Start a conversation
              </button>
            )}
          </div>
        ) : sorted.map(c => (
          <ChatItem
            key={c.id}
            conversation={c}
            active={c.id === activeId}
            hovered={c.id === hoveredId}
            renaming={renamingId === c.id}
            renameText={renameText}
            onHover={setHoveredId}
            onSelect={() => onSelect(c.id)}
            onDelete={() => onDelete(c.id)}
            onStartRename={() => startRename(c.id, c.title)}
            onRenameTextChange={setRenameText}
            onCommitRename={commitRename}
            onRenameKeyDown={handleRenameKey}
            renameRef={renameRef}
          />
        ))}
      </div>

      {/* Bottom Context Window */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
      }}>
        <ContextWindow used={contextUsed} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 20,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      />
    </div>
  );
};

/* ─── Chat Item ─── */
const ChatItem: FC<{
  conversation: Conversation;
  active: boolean;
  hovered: boolean;
  renaming: boolean;
  renameText: string;
  onHover: (id: string | null) => void;
  onSelect: () => void;
  onDelete: () => void;
  onStartRename: () => void;
  onRenameTextChange: (t: string) => void;
  onCommitRename: () => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  renameRef: React.RefObject<HTMLInputElement | null>;
}> = ({ conversation: c, active, hovered, renaming, renameText, onHover, onSelect, onDelete, onStartRename, onRenameTextChange, onCommitRename, onRenameKeyDown, renameRef }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const preview = c.lastMessagePreview.length > 50 ? c.lastMessagePreview.slice(0, 47) + '...' : c.lastMessagePreview;

  return (
    <div
      onClick={renaming ? undefined : onSelect}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => { onHover(null); if (!showMenu) setShowMenu(false); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        borderRadius: 'var(--radius-sm)',
        cursor: renaming ? 'default' : 'pointer',
        background: active ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.1s',
        marginBottom: 1,
        position: 'relative',
      }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: active ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? 'var(--accent-blue)' : 'var(--text-faint)' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <input
            ref={renameRef}
            value={renameText}
            onChange={e => onRenameTextChange(e.target.value)}
            onKeyDown={onRenameKeyDown}
            onBlur={onCommitRename}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--accent-blue)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
        ) : (
          <div style={{
            fontSize: 13,
            fontWeight: active ? 500 : 400,
            color: active ? 'var(--text-heading)' : 'var(--text-primary)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {c.title}
          </div>
        )}
        {!renaming && preview && (
          <div style={{
            fontSize: 10,
            color: 'var(--text-faint)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}>
            {preview}
          </div>
        )}
      </div>
      {!renaming && (
        <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0, opacity: hovered || active ? 1 : 0, transition: 'opacity 0.15s' }}>
          {timeAgo(c.updatedAt)}
        </span>
      )}

      {!renaming && (
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer',
              padding: '3px', borderRadius: 4, display: 'flex', alignItems: 'center',
              opacity: hovered || active || showMenu ? 1 : 0, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '4px', minWidth: 130, zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              <MenuItem icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              } label="Rename" onClick={() => { onStartRename(); setShowMenu(false); }} />
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '3px 0' }} />
              <MenuItem icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-error)" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              } label="Delete" danger onClick={() => { onDelete(); setShowMenu(false); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MenuItem: FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 7,
      padding: '5px 8px', borderRadius: 5, border: 'none', background: 'transparent',
      color: danger ? 'var(--status-error)' : 'var(--text-primary)',
      cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
      transition: 'background 0.1s', textAlign: 'left',
    }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'var(--bg-hover)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    {icon}
    {label}
  </button>
);

export default Sidebar;
