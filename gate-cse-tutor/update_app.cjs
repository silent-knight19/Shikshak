const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state and refs
content = content.replace(
  "  const [showSubjectMenu, setShowSubjectMenu] = useState(false);",
  "  const [showSubjectMenu, setShowSubjectMenu] = useState(false);\n  const [showAddMenu, setShowAddMenu] = useState(false);\n  const addMenuRef = useRef<HTMLDivElement>(null);\n  const addBtnRef = useRef<HTMLButtonElement>(null);"
);

// 2. Update click outside listener
content = content.replace(
  "  useEffect(() => {\n    if (!showSubjectMenu) return;",
  "  useEffect(() => {\n    if (!showSubjectMenu && !showAddMenu) return;"
);
content = content.replace(
  "        subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node) &&\n        subjectBtnRef.current && !subjectBtnRef.current.contains(e.target as Node)\n      ) {\n        setShowSubjectMenu(false);\n      }",
  "        subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node) &&\n        subjectBtnRef.current && !subjectBtnRef.current.contains(e.target as Node)\n      ) {\n        setShowSubjectMenu(false);\n      }\n      if (\n        addMenuRef.current && !addMenuRef.current.contains(e.target as Node) &&\n        addBtnRef.current && !addBtnRef.current.contains(e.target as Node)\n      ) {\n        setShowAddMenu(false);\n      }"
);
content = content.replace(
  "  }, [showSubjectMenu]);",
  "  }, [showSubjectMenu, showAddMenu]);"
);

// 3. Define new Add Menu and + button
const addMenuHtml = `
                {/* Add menu popover */}
                {showAddMenu && (
                  <div
                    ref={addMenuRef}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 12px)',
                      left: 0,
                      width: 280,
                      background: '#282a2c', // Dark premium background
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: 8,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      animation: 'slideUp 0.15s ease-out forwards',
                    }}
                  >
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAddMenu(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                      </span>
                      Add photos & files
                    </button>
                    
                    <button
                      onClick={() => {
                        setVisualiseMode(!visualiseMode);
                        setShowAddMenu(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: visualiseMode ? 'var(--accent-blue)' : '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                      </span>
                      Visualise UI
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 400 }}>
                        {visualiseMode ? 'On' : 'Off'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSubjectMenu(true);
                        setShowAddMenu(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </span>
                      Select Subject
                    </button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.doc,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {/* + button */}
                <button
                  ref={addBtnRef}
                  onClick={() => setShowAddMenu(prev => !prev)}
                  title="Add menu"
                  style={{
                    background: showAddMenu ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (!showAddMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={e => {
                    if (!showAddMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <svg 
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: showAddMenu ? 'rotate(45deg)' : 'rotate(0deg)' }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
`;

const voiceButtonHtml = `
                {/* Voice typing button */}
                {browserSupportsSpeechRecognition && (
                  <button
                    onClick={toggleVoice}
                    title={listening ? 'Stop listening' : 'Voice typing'}
                    style={{
                      background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',
                      border: 'none',
                      color: listening ? '#ef4444' : 'var(--text-faint)',
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
                      if (!listening) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!listening) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-faint)';
                      }
                    }}
                  >
                    {listening ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="6" height="6" rx="1" ry="1" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    )}
                  </button>
                )}
`;

// Make position relative for the input pill so absolute popover works correctly
content = content.replace(
  "              <div style={{\n                display: 'flex',",
  "              <div style={{\n                position: 'relative',\n                display: 'flex',"
);

// We need to carefully remove the old buttons and inject the new ones
// Since we have a complex replacement, we'll slice the string

const startIndex = content.indexOf("{/* Subject toggle button */}");
const endIndex = content.indexOf("{/* Text input */}");

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end index for old buttons");
  process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

content = before + addMenuHtml + "\n" + after;

// Now move voiceButton to just before Send / Stop button
const sendStopIndex = content.indexOf("{/* Send / Stop button */}");
if (sendStopIndex === -1) {
  console.error("Could not find Send / Stop button");
  process.exit(1);
}

const beforeSend = content.substring(0, sendStopIndex);
const afterSend = content.substring(sendStopIndex);

content = beforeSend + voiceButtonHtml + "\n" + afterSend;

// Finally, there might be a trailing VisualiseToggle import that we should remove since we integrated it.
content = content.replace("import VisualiseToggle from './components/input/VisualiseToggle';\n", "");

// Ensure we don't accidentally leave the selected subject chip inside the add menu area, it should stay. 
// Wait, in my replacement, I removed it. Let's fix that.
// We removed everything from Subject toggle button to Text input. That included the Selected subject chip!
// Let's add it back right after the Add button.
const selectedSubjectHtml = `
                {/* Selected subject chip */}
                {selectedSubject && (
                  <span style={{
                    background: 'rgba(138,180,248,0.12)',
                    color: 'var(--accent-blue)',
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    lineHeight: 1.3,
                  }}>
                    {selectedSubject}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubject(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 13,
                        lineHeight: 1,
                        opacity: 0.6,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                    >
                      x
                    </button>
                  </span>
                )}
`;

content = content.replace(
  "{/* Text input */}",
  selectedSubjectHtml + "\n                {/* Text input */}"
);

fs.writeFileSync('src/App.tsx', content);
console.log('Update script completed successfully!');
