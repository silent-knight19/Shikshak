import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AppShell from './components/layout/AppShell';
import Sidebar from './components/layout/Sidebar';
import MessageBubble from './components/response/MessageBubble';
import ThinkingBlock from './components/response/ThinkingBlock';
import StreamingCursor from './components/response/StreamingCursor';
import LoadingDots from './components/response/LoadingDots';
import MarkdownRenderer from './components/render/MarkdownRenderer';
import VizFrame from './components/response/VizFrame';
import GoogleSignIn from './components/auth/GoogleSignIn';
import UserMenu from './components/auth/UserMenu';
import SettingsModal from './components/settings/SettingsModal';
import { useAuth } from './firebase/auth';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useSettings } from './hooks/useSettings';
import { useStreaming } from './hooks/useStreaming';
import { uploadFile } from './firebase/storage';
import {
  addUserMessage as fbAddUserMessage,
  createAssistantMessage as fbCreateAssistantMessage,
  updateAssistantMessage as fbUpdateAssistantMessage,
  finalizeAssistantMessage as fbFinalizeAssistantMessage,
} from './firebase/db';
import type { SubjectTag, Attachment } from './store/types';
import { SUBJECT_TAGS } from './store/types';
import { parseResponse } from './utils/parseResponse';

function TypewriterFormatted({ text, streaming }: { text: string; streaming: boolean }) {
  const [display, setDisplay] = useState('');
  const idxRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const rafRef = useRef<number>(0);
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    wordsRef.current = text.match(/\S+\s*/g) ?? (text ? [text] : []);
  }, [text]);

  useEffect(() => {
    idxRef.current = 0;
    setDisplay('');

    if (!streaming) {
      setDisplay(textRef.current);
      return;
    }

    const tick = () => {
      rafRef.current = 0;
      if (idxRef.current < wordsRef.current.length) {
        idxRef.current++;
        setDisplay(wordsRef.current.slice(0, idxRef.current).join(''));
      }
      // Keep polling while streaming is active so new words from
      // future chunks (which update wordsRef via the text effect)
      // are picked up automatically
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [streaming]);

  return <MarkdownRenderer content={display} />;
}

const SUGGESTION_CHIPS = [
  'Explain DFA minimization with an example',
  'Solve: Round Robin scheduling, quantum = 3',
  'Find candidate keys given FDs',
];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const textBeforeDictationRef = useRef('');

  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem('gate-tutor-active-id'); } catch { return null; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectTag | null>(null);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuIndex, setAddMenuIndex] = useState(0);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);
  const subjectBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{
    id: string;
    file: File;
    dataUrl: string;
    uploadUrl: string;
    uploading: boolean;
  }[]>([]);

  const {
    conversations,
    loading: convsLoading,
    createConversation,
    deleteConversation: delConv,
    renameConversation: renConv,
  } = useConversations();

  const {
    messages,
  } = useMessages(activeId);

  const { settings, saveSettings } = useSettings();
  const visualiseMode = settings.visualiseMode;

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (listening) {
      setInputText(textBeforeDictationRef.current + (textBeforeDictationRef.current && transcript ? ' ' : '') + transcript);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        SpeechRecognition.stopListening();
      }, 3000);
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, listening]);

  const toggleVoice = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      textBeforeDictationRef.current = inputText;
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  const {
    streaming,
    answerText: streamingAnswer,
    thinkingText: streamingThinking,
    error: streamError,
    tokenUsage: liveTokenUsage,
    startStream,
    stopStream,
  } = useStreaming();

  useEffect(() => {
    if (activeId) localStorage.setItem('gate-tutor-active-id', activeId);
    else localStorage.removeItem('gate-tutor-active-id');
  }, [activeId]);

  useEffect(() => {
    if (showAddMenu) setAddMenuIndex(0);
  }, [showAddMenu]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingAnswer]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [inputText]);

  useEffect(() => {
    if (!showSubjectMenu && !showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node) &&
        subjectBtnRef.current && !subjectBtnRef.current.contains(e.target as Node)
      ) {
        setShowSubjectMenu(false);
      }
      if (
        addMenuRef.current && !addMenuRef.current.contains(e.target as Node) &&
        addBtnRef.current && !addBtnRef.current.contains(e.target as Node)
      ) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSubjectMenu, showAddMenu]);

  const ensureConversation = useCallback(async (subject: string | null): Promise<string> => {
    if (activeId && conversations.some(c => c.id === activeId)) return activeId;
    const id = await createConversation(subject);
    setActiveId(id);
    return id;
  }, [activeId, conversations, createConversation]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text && pendingFiles.length === 0) return;
    if (streaming) return;
    if (pendingFiles.some(p => p.uploading)) return;

    const convId = await ensureConversation(selectedSubject);

    const attachments: Attachment[] = [];
    const imageParts: { mimeType: string; data: string }[] = [];

    for (const pf of pendingFiles) {
      const displayUrl = pf.uploadUrl || pf.dataUrl;
      if (displayUrl) {
        attachments.push({
          id: pf.id,
          name: pf.file.name,
          type: pf.file.type,
          size: pf.file.size,
          url: displayUrl,
        });
      }
      if (pf.file.type.startsWith('image/')) {
        const base64 = pf.dataUrl.split(',')[1];
        imageParts.push({ mimeType: pf.file.type, data: base64 });
      }
    }

    const uid = user!.uid;
    await fbAddUserMessage(uid, convId, text, selectedSubject, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setPendingFiles([]);
    const assistantMsgId = await fbCreateAssistantMessage(uid, convId, selectedSubject);

    const msgsForApi = messages.concat({
      id: '',
      role: 'user' as const,
      content: text,
      subject: selectedSubject,
      attachments: attachments.length > 0 ? attachments : undefined,
      thinkingTrace: '',
      status: 'completed',
      createdAt: Date.now(),
    }).map(m => ({
      role: m.role,
      text: m.content,
      attachments: m.attachments,
    }));

    let lastFlushAnswer = '';
    let lastFlushThinking = '';

    const result = await startStream(
      msgsForApi,
      selectedSubject ? [selectedSubject] : [],
      visualiseMode,
      imageParts.length > 0 ? imageParts : undefined,
      (fullAnswer, fullThinking, usage) => {
        if (!assistantMsgId) return;
        const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 ||
          fullThinking.length - lastFlushThinking.length > 200;
        if (shouldFlush) {
          lastFlushAnswer = fullAnswer;
          lastFlushThinking = fullThinking;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fbUpdateAssistantMessage(uid, convId, assistantMsgId, {
              content: fullAnswer,
              thinkingTrace: fullThinking,
              tokens: usage ?? null,
            });
          }, 200);
        }
      },
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (result && assistantMsgId) {
      const { textContent } = parseResponse(result.answer);
      await fbFinalizeAssistantMessage(uid, convId, assistantMsgId, textContent, result.thinking, result.tokenUsage);
    } else if (assistantMsgId) {
      await fbUpdateAssistantMessage(uid, convId, assistantMsgId, { status: 'error' });
    }
  }, [inputText, pendingFiles, streaming, selectedSubject, ensureConversation, messages, startStream, visualiseMode, user]);

  const handleNewChat = useCallback(async () => {
    const id = await createConversation(selectedSubject);
    setActiveId(id);
  }, [createConversation, selectedSubject]);

  const handleDeleteConversation = useCallback((id: string) => {
    delConv(id);
    if (activeId === id) setActiveId(prev => prev === id ? null : prev);
  }, [activeId, delConv]);

  const handleRenameConversation = useCallback((id: string, title: string) => {
    renConv(id, title);
  }, [renConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAddMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAddMenuIndex(prev => (prev + 1) % 3);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAddMenuIndex(prev => (prev - 1 + 3) % 3);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (addMenuIndex === 0) {
          fileInputRef.current?.click();
        } else if (addMenuIndex === 1) {
          saveSettings({ ...settings, visualiseMode: !settings.visualiseMode });
        } else if (addMenuIndex === 2) {
          setShowSubjectMenu(true);
        }
        setShowAddMenu(false);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAddMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSendMessage();
    } else if (e.key === '/' && inputText.trim() === '') {
      e.preventDefault();
      setShowAddMenu(true);
    }
  };

  const handleChipClick = (text: string) => {
    setInputText(text);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    const newFiles: typeof pendingFiles = [];

    for (const file of fileList) {
      try {
        const id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        newFiles.push({ id, file, dataUrl, uploadUrl: '', uploading: true });
      } catch (err) {
        console.error('Failed to read file:', file.name, err);
      }
    }

    if (newFiles.length === 0) return;
    setPendingFiles(prev => [...prev, ...newFiles]);

    for (const entry of newFiles) {
      try {
        const convId = activeId || 'pending';
        const url = await uploadFile(user!.uid, convId, entry.file);
        setPendingFiles(prev =>
          prev.map(p => p.id === entry.id ? { ...p, uploadUrl: url, uploading: false } : p),
        );
      } catch (err) {
        console.error('File upload failed:', entry.file.name, err);
        setPendingFiles(prev =>
          prev.map(p => p.id === entry.id ? { ...p, uploading: false } : p),
        );
      }
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  };

  const handleSubjectSelect = (subject: SubjectTag | null) => {
    setSelectedSubject(subject);
    setShowSubjectMenu(false);
    if (activeId && messages.length > 0) {
      createConversation(subject).then(id => setActiveId(id));
    }
    textareaRef.current?.focus();
  };

  const contextUsed = useMemo(() => {
    if (streaming && liveTokenUsage) {
      return liveTokenUsage.prompt + liveTokenUsage.completion;
    }
    if (messages.length === 0) return 0;
    let total = 0;
    for (const m of messages) {
      if (m.tokens) {
        total = m.tokens.prompt + m.tokens.completion;
      } else {
        total += Math.round((m.content.length + m.thinkingTrace.length) / 4);
      }
    }
    return total;
  }, [messages, streaming, liveTokenUsage]);

  const displayMessages = messages;

  const canSend = (inputText.trim() || pendingFiles.length > 0) && !streaming && !pendingFiles.some(p => p.uploading);
  const showEmpty = displayMessages.length === 0 && !streaming;

  if (authLoading) {
    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-root)',
      }}>
        <div style={{ color: 'var(--text-faint)', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <GoogleSignIn />;

  return (
    <div style={{ animation: 'appFadeIn 0.3s ease' }}>
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={(s) => { saveSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
      <AppShell
        sidebar={
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            loading={convsLoading}
            onSelect={(id) => {
              setActiveId(id);
            }}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            onNewChat={handleNewChat}
            contextUsed={contextUsed}
          />
        }
      >
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--bg-root)', position: 'relative',
        }}>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '8px 16px', gap: 8, flexShrink: 0,
          }}>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-faint)',
                cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            <UserMenu />
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {showEmpty ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '0 24px', animation: 'fadeIn 0.5s ease',
              }}>
                <div style={{
                  fontSize: 32, fontWeight: 400, color: 'var(--text-heading)',
                  textAlign: 'center', lineHeight: 1.3, letterSpacing: '-0.02em',
                  marginBottom: 40,
                }}>
                  Hello, {user.displayName?.split(' ')[0] ?? 'there'}
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 680,
                }}>
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-muted)', fontSize: 13,
                        padding: '8px 16px', borderRadius: 'var(--radius-pill)',
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--bg-surface)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: 960, width: '100%', margin: '0 auto', padding: '24px 48px', flex: 1 }}>
                  {displayMessages
                    .filter(msg => !(streaming && msg.status === 'streaming'))
                    .map(msg => (
                    <MessageBubble key={msg.id} role={msg.role}>
                      {msg.role === 'user' ? (
                        <div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {msg.attachments.map(att => (
                                att.type.startsWith('image/') ? (
                                  <img key={att.id} src={att.url} alt={att.name}
                                    style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => window.open(att.url, '_blank')}
                                  />
                                ) : (
                                  <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', color: 'var(--accent-blue)', textDecoration: 'none', fontSize: 12 }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                      <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    {att.name}
                                  </a>
                                )
                              ))}
                            </div>
                          )}
                          <div style={{ color: 'var(--text-user)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {msg.thinkingTrace && <ThinkingBlock text={msg.thinkingTrace} streaming={msg.status === 'streaming'} />}
                          {msg.status === 'streaming' ? (
                            <>
                              {msg.content && <MarkdownRenderer content={msg.content.replace(/<visualization>[\s\S]*?(<\/visualization>|$)/gi, '').replace(/```mermaid[\s\S]*?(```|$)/gi, '').replace(/```mmd[\s\S]*?(```|$)/gi, '')} />}
                              <StreamingCursor />
                            </>
                          ) : (
                            <>
                              <MarkdownRenderer content={msg.content} suppressMermaid={!!msg.visualizationHTML} />
                              <VizFrame html={msg.visualizationHTML ?? null} />
                            </>
                          )}
                        </div>
                      )}
                    </MessageBubble>
                  ))}

                  {streaming && (
                    <MessageBubble role="assistant">
                      {streamingThinking && <ThinkingBlock text={streamingThinking} streaming={true} />}
                      {streamingAnswer ? (
                        <>
                          <TypewriterFormatted text={streamingAnswer} streaming={true} />
                          <StreamingCursor />
                        </>
                      ) : !streamingThinking ? (
                        <LoadingDots />
                      ) : null}
                    </MessageBubble>
                  )}

                  {streamError && (
                    <div style={{
                      padding: '10px 14px', marginTop: 8,
                      border: '1px solid var(--status-error)', borderRadius: 'var(--radius)',
                      background: 'var(--status-error-bg)', color: 'var(--status-error)',
                      fontSize: 13, animation: 'slideInError 0.25s ease',
                    }}>
                      {streamError}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding: '0 48px 24px', background: 'var(--bg-root)' }}>
            <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
              {showSubjectMenu && (
                <div ref={subjectMenuRef} style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                  background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16, padding: 10, zIndex: 50, animation: 'fadeIn 0.15s ease',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button onClick={() => handleSubjectSelect(null)} style={{
                      background: selectedSubject === null ? 'rgba(138,180,248,0.15)' : 'transparent',
                      border: '1px solid', fontSize: 12, fontWeight: 500, padding: '6px 14px',
                      borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      borderColor: selectedSubject === null ? 'rgba(138,180,248,0.4)' : 'rgba(255,255,255,0.1)',
                      color: selectedSubject === null ? 'var(--accent-blue)' : 'var(--text-muted)',
                      transition: 'all var(--transition-fast)',
                    }}>General</button>
                    {SUBJECT_TAGS.map(subject => {
                      const active = selectedSubject === subject;
                      return (
                        <button key={subject} onClick={() => handleSubjectSelect(subject)} style={{
                          background: active ? 'rgba(138,180,248,0.15)' : 'transparent',
                          border: '1px solid', fontSize: 12, fontWeight: 500, padding: '6px 14px',
                          borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                          borderColor: active ? 'rgba(138,180,248,0.4)' : 'rgba(255,255,255,0.1)',
                          color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                          transition: 'all var(--transition-fast)',
                        }}>{subject}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {pendingFiles.map(pf => (
                    <div key={pf.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                      padding: '6px 10px 6px 6px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 220,
                    }}>
                      {pf.file.type.startsWith('image/') ? (
                        <img src={pf.dataUrl} alt={pf.file.name}
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pf.file.name}</span>
                      {pf.uploading ? (
                        <span style={{ fontSize: 10, color: 'var(--accent-blue)', flexShrink: 0 }}>...</span>
                      ) : (
                        <button onClick={() => removePendingFile(pf.id)} title="Remove" style={{
                          background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer',
                          padding: 0, display: 'flex', alignItems: 'center', fontSize: 14, lineHeight: 1, flexShrink: 0,
                        }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8,
                background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-pill)', padding: '8px 12px 8px 8px',
                transition: 'border-color var(--transition-smooth), box-shadow var(--transition-smooth)',
                boxShadow: inputFocused ? '0 0 0 1px rgba(138,180,248,0.15)' : 'none',
                borderColor: inputFocused ? 'rgba(138,180,248,0.3)' : 'rgba(255,255,255,0.08)',
              }}>
                {showAddMenu && (
                  <div ref={addMenuRef} style={{
                    position: 'absolute', bottom: 'calc(100% + 12px)', left: 0, width: 280,
                    background: '#282a2c', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16, padding: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    zIndex: 100, display: 'flex', flexDirection: 'column', gap: 4,
                    animation: 'slideUp 0.15s ease-out forwards',
                  }}>
                    <button onClick={() => { fileInputRef.current?.click(); setShowAddMenu(false); }} style={{
                      background: addMenuIndex === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                      </span>
                      Add photos & files
                    </button>
                    <button onClick={() => { saveSettings({ ...settings, visualiseMode: !settings.visualiseMode }); setShowAddMenu(false); }} style={{
                      background: addMenuIndex === 1 ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: visualiseMode ? 'var(--accent-blue)' : '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                      </span>
                      Visualise UI
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 400 }}>{visualiseMode ? 'On' : 'Off'}</span>
                    </button>
                    <button onClick={() => { setShowSubjectMenu(true); setShowAddMenu(false); }} style={{
                      background: addMenuIndex === 2 ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </span>
                      Select Subject
                    </button>
                  </div>
                )}

                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFileSelect} style={{ display: 'none' }} />

                <button ref={addBtnRef} onClick={() => setShowAddMenu(prev => !prev)} title="Add menu" style={{
                  background: showAddMenu ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  border: 'none', color: 'var(--text-primary)', cursor: 'pointer', width: 32, height: 32,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--transition-fast)', flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s', transform: showAddMenu ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>

                {selectedSubject && (
                  <span style={{
                    background: 'rgba(138,180,248,0.12)', color: 'var(--accent-blue)', fontSize: 11,
                    fontWeight: 500, padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                    flexShrink: 0, lineHeight: 1.3, alignSelf: 'center',
                  }}>
                    {selectedSubject}
                    <button onClick={(e) => { e.stopPropagation(); setSelectedSubject(null); }} style={{
                      background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer',
                      padding: 0, display: 'flex', alignItems: 'center', fontSize: 13, lineHeight: 1, opacity: 0.6,
                    }}>x</button>
                  </span>
                )}

                <textarea
                  ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown} onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)} placeholder="Ask a GATE CSE question..."
                  rows={1}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 15,
                    lineHeight: 1.5, resize: 'none', maxHeight: 120, padding: '4px 0',
                  }}
                />

                {inputText.length === 0 && pendingFiles.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap', paddingBottom: 4, opacity: 0.5, userSelect: 'none' }}>
                    ⇧ Enter
                  </span>
                )}

                {browserSupportsSpeechRecognition && (
                  <button onClick={toggleVoice} title={listening ? 'Stop listening' : 'Voice typing'} style={{
                    background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',
                    animation: listening ? 'pulseRed 1.5s infinite' : 'none',
                    border: 'none', color: listening ? '#ef4444' : 'var(--text-faint)', cursor: 'pointer',
                    width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transition: 'all var(--transition-fast)', flexShrink: 0,
                  }}>
                    {listening ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="6" height="6" rx="1" ry="1" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    )}
                  </button>
                )}

                {streaming ? (
                  <button onClick={stopStream} title="Stop generating" style={{
                    background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer',
                    width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transition: 'all var(--transition-fast)', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                  </button>
                ) : (
                  <button onClick={handleSendMessage} disabled={!canSend} style={{
                    background: canSend ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: canSend ? '#131314' : 'var(--text-faint)',
                    cursor: canSend ? 'pointer' : 'default', width: 38, height: 38, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--transition-fast)', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </div>
  );
}
