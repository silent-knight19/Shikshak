import { useRef, type FC } from 'react';
import type { SubjectTag } from '../../store/types';

interface PendingFile {
  id: string;
  file: File;
  dataUrl: string;
  uploadUrl: string;
  uploading: boolean;
}

interface ChatInputBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedSubject: SubjectTag | null;
  setSelectedSubject: (s: SubjectTag | null) => void;
  showSubjectMenu: boolean;
  setShowSubjectMenu: (v: boolean) => void;
  showAddMenu: boolean;
  setShowAddMenu: (v: boolean) => void;
  addMenuIndex: number;
  setAddMenuIndex: (v: number) => void;
  editingMsgId: string | null;
  handleCancelEdit: () => void;
  pendingFiles: PendingFile[];
  removePendingFile: (id: string) => void;
  canSend: boolean;
  streaming: boolean;
  visualiseMode: boolean;
  webSearch: boolean;
  listening: boolean;
  browserSupportsSpeechRecognition: boolean;
  toggleVoice: () => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  stopStream: () => void;
  handleSubjectSelect: (s: SubjectTag | null) => void;
  saveSettings: (s: any) => void;
  settings: any;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInputBar: FC<ChatInputBarProps> = ({
  inputText, setInputText, selectedSubject, setSelectedSubject,
  showSubjectMenu, setShowSubjectMenu, showAddMenu, setShowAddMenu,
  addMenuIndex, setAddMenuIndex, editingMsgId, handleCancelEdit,
  pendingFiles, removePendingFile, canSend, streaming,
  visualiseMode, webSearch, listening, browserSupportsSpeechRecognition,
  toggleVoice, handleSendMessage, handleKeyDown, stopStream,
  handleSubjectSelect, saveSettings, settings, handleFileSelect,
}) => {
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      padding: '0 6px 6px',
      background: 'var(--bg-root)',
      paddingBottom: 'calc(6px + var(--safe-area-bottom))',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
        {showSubjectMenu && (
          <div ref={subjectMenuRef} className="subject-menu-container">
            <div className="subject-menu-grid">
              <div className="subject-menu-column">
                <div className="subject-menu-col-title">Maths & Aptitude</div>
                <button onClick={() => handleSubjectSelect(null)} className={`subject-menu-btn ${selectedSubject === null ? 'active' : ''}`}>
                  <span className="subject-dot" />General
                </button>
                <button onClick={() => handleSubjectSelect('Discrete Mathematics')} className={`subject-menu-btn ${selectedSubject === 'Discrete Mathematics' ? 'active' : ''}`}>
                  <span className="subject-dot" />Discrete Mathematics
                </button>
                <button onClick={() => handleSubjectSelect('Engineering Mathematics')} className={`subject-menu-btn ${selectedSubject === 'Engineering Mathematics' ? 'active' : ''}`}>
                  <span className="subject-dot" />Engineering Mathematics
                </button>
              </div>
              <div className="subject-menu-column">
                <div className="subject-menu-col-title">Systems & Hardware</div>
                <button onClick={() => handleSubjectSelect('Digital Logic')} className={`subject-menu-btn ${selectedSubject === 'Digital Logic' ? 'active' : ''}`}>
                  <span className="subject-dot" />Digital Logic
                </button>
                <button onClick={() => handleSubjectSelect('Computer Organization')} className={`subject-menu-btn ${selectedSubject === 'Computer Organization' ? 'active' : ''}`}>
                  <span className="subject-dot" />Computer Organization
                </button>
                <button onClick={() => handleSubjectSelect('Operating Systems')} className={`subject-menu-btn ${selectedSubject === 'Operating Systems' ? 'active' : ''}`}>
                  <span className="subject-dot" />Operating Systems
                </button>
                <button onClick={() => handleSubjectSelect('Computer Networks')} className={`subject-menu-btn ${selectedSubject === 'Computer Networks' ? 'active' : ''}`}>
                  <span className="subject-dot" />Computer Networks
                </button>
              </div>
              <div className="subject-menu-column">
                <div className="subject-menu-col-title">Theory & Software</div>
                <button onClick={() => handleSubjectSelect('Data Structures')} className={`subject-menu-btn ${selectedSubject === 'Data Structures' ? 'active' : ''}`}>
                  <span className="subject-dot" />Data Structures
                </button>
                <button onClick={() => handleSubjectSelect('Algorithms')} className={`subject-menu-btn ${selectedSubject === 'Algorithms' ? 'active' : ''}`}>
                  <span className="subject-dot" />Algorithms
                </button>
                <button onClick={() => handleSubjectSelect('Databases')} className={`subject-menu-btn ${selectedSubject === 'Databases' ? 'active' : ''}`}>
                  <span className="subject-dot" />Databases
                </button>
                <button onClick={() => handleSubjectSelect('Theory of Computation')} className={`subject-menu-btn ${selectedSubject === 'Theory of Computation' ? 'active' : ''}`}>
                  <span className="subject-dot" />Theory of Computation
                </button>
                <button onClick={() => handleSubjectSelect('Compiler Design')} className={`subject-menu-btn ${selectedSubject === 'Compiler Design' ? 'active' : ''}`}>
                  <span className="subject-dot" />Compiler Design
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {pendingFiles.map(pf => (
              <div key={pf.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                padding: '6px 10px 6px 6px', fontSize: '0.857em', color: 'var(--text-muted)', maxWidth: 220,
              }}>
                {pf.file.type.startsWith('image/') ? (
                  <img src={pf.dataUrl} alt={pf.file.name}
                    style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pf.file.name}</span>
                {pf.uploading ? (
                  <span style={{ fontSize: '0.714em', color: 'var(--accent-blue)', flexShrink: 0 }}>...</span>
                ) : (
                  <button onClick={() => removePendingFile(pf.id)} style={{
                    background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center', fontSize: '1em', lineHeight: 1, flexShrink: 0,
                  }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="chat-input-container">
          {showAddMenu && (
            <AddMenu
              ref={addMenuRef}
              index={addMenuIndex}
              visualiseMode={visualiseMode}
              onSelect={(idx: number) => {
                setAddMenuIndex(idx);
                if (idx === 0) fileInputRef.current?.click();
                else if (idx === 1) saveSettings({ ...settings, visualiseMode: !settings.visualiseMode });
                else if (idx === 2) setShowSubjectMenu(true);
                setShowAddMenu(false);
              }}
            />
          )}

          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFileSelect} style={{ display: 'none' }} />

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMsgId ? 'Edit your message...' : 'Ask Shikshak a question...'}
            rows={1}
            className="chat-input-textarea"
            inputMode="text"
            autoComplete="off"
          />

          <div className="chat-input-bottom-bar">
            <div className="chat-input-action-group">
              <button ref={addBtnRef} onClick={() => setShowAddMenu(!showAddMenu)} title="Add menu"
                className={`chat-action-btn chat-add-btn ${showAddMenu ? 'active' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transition: 'transform 0.2s', transform: showAddMenu ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              {selectedSubject && (
                <span style={{
                  background: 'rgba(138,180,248,0.12)', color: 'var(--accent-blue)', fontSize: '0.786em',
                  fontWeight: 500, padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0, lineHeight: 1.3,
                }}>
                  {selectedSubject}
                  <button onClick={() => setSelectedSubject(null)} style={{
                    background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center', opacity: 0.6,
                  }}>×</button>
                </span>
              )}

              <button
                onClick={() => saveSettings({ ...settings, webSearch: !settings.webSearch })}
                className="chat-action-btn"
                title={`Web search: ${webSearch ? 'ON' : 'OFF'}`}
                style={{ color: webSearch ? 'var(--accent-blue)' : 'var(--text-faint)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>

            <div className="chat-input-action-group">
              {browserSupportsSpeechRecognition && (
                <button onClick={toggleVoice} title={listening ? 'Stop listening' : 'Voice typing'}
                  className="chat-action-btn"
                  style={{
                    background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',
                    animation: listening ? 'pulseRed 1.5s infinite' : 'none',
                    color: listening ? '#ef4444' : 'var(--text-faint)',
                  }}>
                  {listening ? (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="6" height="6" rx="1" ry="1" /></svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                  )}
                </button>
              )}

              {editingMsgId && (
                <button onClick={handleCancelEdit} title="Cancel edit" className="chat-action-btn" style={{ color: 'var(--text-faint)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}

              {streaming ? (
                <button onClick={stopStream} title="Stop generating" className="chat-action-btn" style={{ background: '#ef4444', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              ) : (
                <button onClick={handleSendMessage} disabled={!canSend}
                  className={`chat-action-btn chat-send-btn ${canSend ? 'active' : ''}`}
                  title={editingMsgId ? 'Update' : 'Send'}
                  style={{ width: 48, height: 48 }}>
                  {editingMsgId ? (
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddMenu = ({ ref, index, visualiseMode, onSelect }: {
  ref?: any; index: number; visualiseMode: boolean; onSelect: (idx: number) => void;
}) => (
  <div ref={ref} style={{
    position: 'absolute', bottom: 'calc(100% + 12px)', left: 0, width: 280,
    background: '#282a2c', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
    zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4,
    animation: 'slideUp 0.15s ease-out forwards',
  }}>
    <button onClick={() => onSelect(0)} style={{
      background: index === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
      fontSize: '1em', fontWeight: 500,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      Add photos & files
    </button>
    <button onClick={() => onSelect(1)} style={{
      background: index === 1 ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
      fontSize: '1em', fontWeight: 500,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      Visualise UI
      <span style={{ marginLeft: 'auto', fontSize: '0.857em', color: 'var(--text-faint)', fontWeight: 400 }}>{visualiseMode ? 'On' : 'Off'}</span>
    </button>
    <button onClick={() => onSelect(2)} style={{
      background: index === 2 ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
      fontSize: '1em', fontWeight: 500,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      Select Subject
    </button>
  </div>
);

export default ChatInputBar;
