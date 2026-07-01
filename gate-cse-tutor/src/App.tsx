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
import SearchSources from './components/response/SearchSources';
import WebSearchToggle from './components/input/WebSearchToggle';
import GoogleSignIn from './components/auth/GoogleSignIn';
import UserMenu from './components/auth/UserMenu';
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
  updateMessage as fbUpdateMessage,
  deleteMessagesFrom as fbDeleteMessagesFrom,
  updateMessageFeedback as fbUpdateMessageFeedback,
} from './firebase/db';
import type { SubjectTag, Attachment, FirestoreMessage } from './store/types';
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
  const [inputText, setInputText] = useState('');
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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userIsNearBottomRef = useRef(true);

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
  const autoSendRef = useRef(false);
  const inputTextRef = useRef(inputText);
  
  const triggerSendEvent = useCallback(() => {
    window.dispatchEvent(new CustomEvent('gate-tutor-auto-send'));
  }, []);

  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    if (listening) {
      setInputText(textBeforeDictationRef.current + (textBeforeDictationRef.current && transcript ? ' ' : '') + transcript);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        autoSendRef.current = true;
        SpeechRecognition.stopListening();
      }, 3000);
    } else {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, listening]);

  useEffect(() => {
    if (!listening && autoSendRef.current) {
      autoSendRef.current = false;
      setTimeout(() => {
        triggerSendEvent();
      }, 50);
    }
  }, [listening, triggerSendEvent]);

  useEffect(() => {
    let spacePressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        spacePressed = true;
        textBeforeDictationRef.current = inputTextRef.current;
        resetTranscript();
        SpeechRecognition.startListening({ continuous: true });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePressed) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        spacePressed = false;
        autoSendRef.current = true;
        SpeechRecognition.stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetTranscript]);

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
    searchStatus,
    sources: streamSources,
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
    if (userIsNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingAnswer]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 100;
      userIsNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
        subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node)
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

    const uid = user!.uid;

    if (editingMsgId) {
      await fbUpdateMessage(uid, activeId!, editingMsgId, { content: text });
      await fbDeleteMessagesFrom(uid, activeId!, editingMsgId, false);
      setInputText('');
      setEditingMsgId(null);
      setPendingFiles([]);

      const editIndex = messages.findIndex(m => m.id === editingMsgId);
      const prevMsgs = editIndex >= 0 ? messages.slice(0, editIndex) : messages;
      const msgsForApi = prevMsgs.concat({
        id: '',
        role: 'user' as const,
        content: text,
        subject: selectedSubject,
        attachments: undefined,
        thinkingTrace: '',
        status: 'completed',
        createdAt: Date.now(),
      }).map(m => ({
        role: m.role,
        text: m.content,
        attachments: m.attachments,
      }));

      const assistantMsgId = await fbCreateAssistantMessage(uid, activeId!, selectedSubject);

      let lastFlushAnswer = '';
      let lastFlushThinking = '';

      const result = await startStream(
        msgsForApi,
        selectedSubject ? [selectedSubject] : [],
        visualiseMode,
        undefined,
        settings.webSearch,
        (fullAnswer, fullThinking, usage) => {
          if (!assistantMsgId) return;
          const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 ||
            fullThinking.length - lastFlushThinking.length > 200;
          if (shouldFlush) {
            lastFlushAnswer = fullAnswer;
            lastFlushThinking = fullThinking;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              fbUpdateAssistantMessage(uid, activeId!, assistantMsgId, {
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
        const { textContent, visualizationHTML } = parseResponse(result.answer);
        await fbFinalizeAssistantMessage(uid, activeId!, assistantMsgId, textContent, result.thinking, result.tokenUsage, visualizationHTML, result.sources);
      } else if (assistantMsgId) {
        await fbUpdateAssistantMessage(uid, activeId!, assistantMsgId, { status: 'error' });
      }
      return;
    }

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
      settings.webSearch,
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
      const { textContent, visualizationHTML } = parseResponse(result.answer);
      await fbFinalizeAssistantMessage(uid, convId, assistantMsgId, textContent, result.thinking, result.tokenUsage, visualizationHTML, result.sources);
    } else if (assistantMsgId) {
      await fbUpdateAssistantMessage(uid, convId, assistantMsgId, { status: 'error' });
    }
  }, [inputText, pendingFiles, streaming, selectedSubject, ensureConversation, messages, editingMsgId, activeId, startStream, settings.webSearch, visualiseMode, user]);

  useEffect(() => {
    const handleAutoSend = () => {
      handleSendMessage();
    };
    window.addEventListener('gate-tutor-auto-send', handleAutoSend);
    return () => window.removeEventListener('gate-tutor-auto-send', handleAutoSend);
  }, [handleSendMessage]);

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
          // No-op
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
      setShowAddMenu(prev => !prev);
    }
  };

  const handleEditMessage = useCallback((msg: FirestoreMessage) => {
    setInputText(msg.content);
    setEditingMsgId(msg.id);
    textareaRef.current?.focus();
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null);
    setInputText('');
  }, []);

  const handleRegenerate = useCallback(async (msgId: string) => {
    if (!user || !activeId || streaming) return;
    const msgs = messages;
    const msgIndex = msgs.findIndex(m => m.id === msgId);
    if (msgIndex < 0) return;

    await fbDeleteMessagesFrom(user.uid, activeId, msgId, true);

    const prevMsgs = msgs.slice(0, msgIndex);
    const lastUserMsg = [...prevMsgs].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    const msgsForApi = prevMsgs.concat({
      id: '',
      role: 'user' as const,
      content: lastUserMsg.content,
      subject: lastUserMsg.subject,
      attachments: lastUserMsg.attachments,
      thinkingTrace: '',
      status: 'completed',
      createdAt: Date.now(),
    }).map(m => ({
      role: m.role,
      text: m.content,
      attachments: m.attachments,
    }));

    const imageParts: { mimeType: string; data: string }[] = [];
    const assistantMsgId = await fbCreateAssistantMessage(user.uid, activeId, lastUserMsg.subject);

    let lastFlushAnswer = '';
    let lastFlushThinking = '';

    const result = await startStream(
      msgsForApi,
      lastUserMsg.subject ? [lastUserMsg.subject as SubjectTag] : [],
      visualiseMode,
      imageParts.length > 0 ? imageParts : undefined,
      settings.webSearch,
      (fullAnswer, fullThinking, usage) => {
        if (!assistantMsgId) return;
        const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 ||
          fullThinking.length - lastFlushThinking.length > 200;
        if (shouldFlush) {
          lastFlushAnswer = fullAnswer;
          lastFlushThinking = fullThinking;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fbUpdateAssistantMessage(user.uid, activeId, assistantMsgId, {
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
      const { textContent, visualizationHTML } = parseResponse(result.answer);
      await fbFinalizeAssistantMessage(user.uid, activeId, assistantMsgId, textContent, result.thinking, result.tokenUsage, visualizationHTML, result.sources);
    } else if (assistantMsgId) {
      await fbUpdateAssistantMessage(user.uid, activeId, assistantMsgId, { status: 'error' });
    }
  }, [user, activeId, streaming, messages, startStream, visualiseMode, settings.webSearch]);

  const handleFeedback = useCallback(async (msgId: string, vote: 'good' | 'bad' | null) => {
    if (!user || !activeId) return;
    await fbUpdateMessageFeedback(user.uid, activeId, msgId, vote);
  }, [user, activeId]);

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
        
        let finalDataUrl = '';
        if (file.type.startsWith('image/')) {
           finalDataUrl = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = (ev) => {
               const img = new Image();
               img.onload = () => {
                 const canvas = document.createElement('canvas');
                 const MAX_WIDTH = 1200;
                 const MAX_HEIGHT = 1200;
                 let width = img.width;
                 let height = img.height;
                 
                 if (width > height) {
                   if (width > MAX_WIDTH) {
                     height *= MAX_WIDTH / width;
                     width = MAX_WIDTH;
                   }
                 } else {
                   if (height > MAX_HEIGHT) {
                     width *= MAX_HEIGHT / height;
                     height = MAX_HEIGHT;
                   }
                 }
                 canvas.width = width;
                 canvas.height = height;
                 const ctx = canvas.getContext('2d');
                 ctx?.drawImage(img, 0, 0, width, height);
                 resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to fit in Firestore
               };
               img.onerror = () => reject(new Error('Failed to load image'));
               img.src = ev.target?.result as string;
             };
             reader.onerror = () => reject(new Error('Failed to read file'));
             reader.readAsDataURL(file);
           });
        } else {
           finalDataUrl = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = () => reject(new Error('Failed to read file'));
             reader.readAsDataURL(file);
           });
        }
        
        // Skip Firebase Storage: set uploadUrl to the base64 string directly
        newFiles.push({ id, file, dataUrl: finalDataUrl, uploadUrl: finalDataUrl, uploading: false });
      } catch (err) {
        console.error('Failed to process file:', file.name, err);
      }
    }

    if (newFiles.length === 0) return;
    setPendingFiles(prev => [...prev, ...newFiles]);
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
    let total = 0;
    for (const m of messages) {
      if (m.tokens) {
        total += m.tokens.prompt + m.tokens.completion;
      } else {
        total += Math.round((m.content.length + m.thinkingTrace.length) / 4);
      }
    }
    if (streaming && liveTokenUsage) {
      total += liveTokenUsage.prompt + liveTokenUsage.completion;
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
        <div style={{ color: 'var(--text-faint)', fontSize: '1em' }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <GoogleSignIn />;

  return (
    <div style={{ animation: 'appFadeIn 0.3s ease' }}>
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
            <UserMenu />
          </div>

          {/* Messages area */}
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {showEmpty ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '0 24px', animation: 'fadeIn 0.5s ease',
              }}>
                <div style={{
                  fontSize: '2.286em', fontWeight: 400, color: 'var(--text-heading)',
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
                        color: 'var(--text-muted)', fontSize: '0.929em',
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
                <div style={{
                  width: '100%', margin: '0 auto', padding: '24px 48px', flex: 1 }}>
                  {displayMessages
                    .filter(msg => !(streaming && msg.status === 'streaming'))
                    .map(msg => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      timestamp={msg.createdAt}
                      streaming={streaming && msg.status === 'streaming'}
                      actions={msg.status === 'completed' ? {
                        role: msg.role,
                        content: msg.content,
                        feedback: msg.feedback ?? null,
                        onEdit: msg.role === 'user' ? () => handleEditMessage(msg) : undefined,
                        onRegenerate: msg.role === 'assistant' ? () => handleRegenerate(msg.id) : undefined,
                        onFeedback: (vote) => handleFeedback(msg.id, vote),
                      } : undefined}
                    >
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
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 10px', color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.857em' }}
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
                          <div style={{ color: 'var(--text-user)', fontSize: '1em', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
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
                              {msg.sources && <SearchSources sources={msg.sources} />}
                            </>
                          )}
                        </div>
                      )}
                    </MessageBubble>
                  ))}

                  {streaming && (
                    <MessageBubble role="assistant">
                      {searchStatus && !streamingAnswer && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          color: 'var(--accent-blue)', fontSize: '0.929em',
                          padding: '12px 0',
                        }}>
                          <div style={{
                            width: 16, height: 16, border: '2px solid var(--accent-blue)',
                            borderTopColor: 'transparent', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            flexShrink: 0,
                          }} />
                          {searchStatus}
                        </div>
                      )}
                      {streamingThinking && <ThinkingBlock text={streamingThinking} streaming={true} />}
                      {!searchStatus && streamingThinking && !streamingAnswer && (
                        <LoadingDots />
                      )}
                      {streamingAnswer ? (
                        <>
                          {searchStatus && (
                            <div style={{
                              fontSize: '0.786em', color: 'var(--accent-blue)',
                              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              {searchStatus}
                            </div>
                          )}
                          <TypewriterFormatted text={streamingAnswer} streaming={true} />
                          <StreamingCursor />
                        </>
                      ) : !streamingThinking && !searchStatus ? (
                        <LoadingDots />
                      ) : null}
                      {streamSources.length > 0 && <SearchSources sources={streamSources} />}
                    </MessageBubble>
                  )}

                  {streamError && (
                    <div style={{
                      padding: '10px 14px', marginTop: 8,
                      border: '1px solid var(--status-error)', borderRadius: 'var(--radius)',
                      background: 'var(--status-error-bg)', color: 'var(--status-error)',
                      fontSize: '0.929em', animation: 'slideInError 0.25s ease',
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
                <div ref={subjectMenuRef} className="subject-menu-container">
                  <div className="subject-menu-grid">
                    {/* Column 1: Maths & Aptitude */}
                    <div className="subject-menu-column">
                      <div className="subject-menu-col-title">Maths & Aptitude</div>
                      
                      <button 
                        onClick={() => handleSubjectSelect(null)}
                        className={`subject-menu-btn ${selectedSubject === null ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        General
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Discrete Mathematics')}
                        className={`subject-menu-btn ${selectedSubject === 'Discrete Mathematics' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Discrete Mathematics
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Engineering Mathematics')}
                        className={`subject-menu-btn ${selectedSubject === 'Engineering Mathematics' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Engineering Mathematics
                      </button>
                    </div>

                    {/* Column 2: Systems & Hardware */}
                    <div className="subject-menu-column">
                      <div className="subject-menu-col-title">Systems & Hardware</div>

                      <button 
                        onClick={() => handleSubjectSelect('Digital Logic')}
                        className={`subject-menu-btn ${selectedSubject === 'Digital Logic' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Digital Logic
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Computer Organization')}
                        className={`subject-menu-btn ${selectedSubject === 'Computer Organization' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Computer Organization
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Operating Systems')}
                        className={`subject-menu-btn ${selectedSubject === 'Operating Systems' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Operating Systems
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Computer Networks')}
                        className={`subject-menu-btn ${selectedSubject === 'Computer Networks' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Computer Networks
                      </button>
                    </div>

                    {/* Column 3: Theory & Software */}
                    <div className="subject-menu-column">
                      <div className="subject-menu-col-title">Theory & Software</div>

                      <button 
                        onClick={() => handleSubjectSelect('Data Structures')}
                        className={`subject-menu-btn ${selectedSubject === 'Data Structures' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Data Structures
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Algorithms')}
                        className={`subject-menu-btn ${selectedSubject === 'Algorithms' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Algorithms
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Databases')}
                        className={`subject-menu-btn ${selectedSubject === 'Databases' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Databases
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Theory of Computation')}
                        className={`subject-menu-btn ${selectedSubject === 'Theory of Computation' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Theory of Computation
                      </button>

                      <button 
                        onClick={() => handleSubjectSelect('Compiler Design')}
                        className={`subject-menu-btn ${selectedSubject === 'Compiler Design' ? 'active' : ''}`}
                      >
                        <span className="subject-dot" />
                        Compiler Design
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
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.143em' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pf.file.name}</span>
                      {pf.uploading ? (
                        <span style={{ fontSize: '0.714em', color: 'var(--accent-blue)', flexShrink: 0 }}>...</span>
                      ) : (
                        <button onClick={() => removePendingFile(pf.id)} title="Remove" style={{
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
                      fontSize: '1em', fontWeight: 500,
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
                      fontSize: '1em', fontWeight: 500,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: visualiseMode ? 'var(--accent-blue)' : '#9ca3af' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                      </span>
                      Visualise UI
                      <span style={{ marginLeft: 'auto', fontSize: '0.857em', color: 'var(--text-faint)', fontWeight: 400 }}>{visualiseMode ? 'On' : 'Off'}</span>
                    </button>
                    <button ref={subjectBtnRef} onClick={() => { setShowSubjectMenu(prev => !prev); setShowAddMenu(false); }} style={{
                      background: addMenuIndex === 2 ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
                      fontSize: '1em', fontWeight: 500,
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

                <textarea
                  ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder={editingMsgId ? 'Edit your message...' : 'Ask Shikshak a question...'}
                  rows={1}
                  className="chat-input-textarea"
                />

                <div className="chat-input-bottom-bar">
                  <div className="chat-input-action-group">
                    <button ref={addBtnRef} onClick={() => setShowAddMenu(prev => !prev)} title="Add menu"
                      className={`chat-action-btn chat-add-btn ${showAddMenu ? 'active' : ''}`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSubject(null); }} style={{
                          background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer',
                          padding: 0, display: 'flex', alignItems: 'center', fontSize: '1.1em', lineHeight: 1, opacity: 0.6,
                        }}>×</button>
                      </span>
                    )}

                    <WebSearchToggle
                      active={settings.webSearch}
                      onToggle={(v) => saveSettings({ ...settings, webSearch: v })}
                    />


                  </div>

                  <div className="chat-input-action-group">
                    {browserSupportsSpeechRecognition && (
                      <button onClick={toggleVoice} title={listening ? 'Stop listening' : 'Voice typing'}
                        className="chat-action-btn"
                        style={{
                          background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',
                          animation: listening ? 'pulseRed 1.5s infinite' : 'none',
                          color: listening ? '#ef4444' : 'var(--text-faint)',
                        }}
                      >
                        {listening ? (
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="6" height="6" rx="1" ry="1" />
                          </svg>
                        ) : (
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                          </svg>
                        )}
                      </button>
                    )}

                    {editingMsgId && (
                      <button onClick={handleCancelEdit} title="Cancel edit"
                        className="chat-action-btn"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}

                    {streaming ? (
                      <button onClick={stopStream} title="Stop generating"
                        className="chat-action-btn"
                        style={{ background: '#ef4444', color: '#fff' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                      </button>
                    ) : (
                      <button onClick={handleSendMessage} disabled={!canSend}
                        className={`chat-action-btn chat-send-btn ${canSend ? 'active' : ''}`}
                        title={editingMsgId ? 'Update' : 'Send'}
                        style={{ width: 48, height: 48 }}
                      >
                        {editingMsgId ? (
                          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </div>
  );
}
