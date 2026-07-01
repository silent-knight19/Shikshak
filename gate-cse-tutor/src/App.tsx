import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AppShell from './components/layout/AppShell';
import Sidebar from './components/layout/Sidebar';
import ChatInputBar from './components/input/ChatInputBar';
import MessageList from './components/response/MessageList';
import GoogleSignIn from './components/auth/GoogleSignIn';
import UserMenu from './components/auth/UserMenu';
import { useAuth } from './firebase/auth';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';
import { useSettings } from './hooks/useSettings';
import { useStreaming } from './hooks/useStreaming';

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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<{
    id: string; file: File; dataUrl: string; uploadUrl: string; uploading: boolean;
  }[]>([]);

  const { conversations, loading: convsLoading, createConversation, deleteConversation: delConv, renameConversation: renConv } = useConversations();
  const { messages } = useMessages(activeId);
  const { settings, saveSettings } = useSettings();
  const visualiseMode = settings.visualiseMode;

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSendRef = useRef(false);
  const inputTextRef = useRef(inputText);

  const triggerSendEvent = useCallback(() => {
    window.dispatchEvent(new CustomEvent('gate-tutor-auto-send'));
  }, []);

  useEffect(() => { inputTextRef.current = inputText; }, [inputText]);

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
    return () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  }, [transcript, listening]);

  useEffect(() => {
    if (!listening && autoSendRef.current) {
      autoSendRef.current = false;
      setTimeout(() => triggerSendEvent(), 50);
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

  const { streaming, answerText: streamingAnswer, thinkingText: streamingThinking, error: streamError, tokenUsage: liveTokenUsage, searchStatus, sources: streamSources, startStream, stopStream } = useStreaming();

  useEffect(() => {
    if (activeId) localStorage.setItem('gate-tutor-active-id', activeId);
    else localStorage.removeItem('gate-tutor-active-id');
  }, [activeId]);

  useEffect(() => { if (showAddMenu) setAddMenuIndex(0); }, [showAddMenu]);

  useEffect(() => {
    if (!showSubjectMenu && !showAddMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showSubjectMenu && !document.querySelector('.subject-menu-container')?.contains(target)) {
        setShowSubjectMenu(false);
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
        id: '', role: 'user' as const, content: text, subject: selectedSubject,
        attachments: undefined, thinkingTrace: '', status: 'completed', createdAt: Date.now(),
      }).map(m => ({ role: m.role, text: m.content, attachments: m.attachments }));

      const assistantMsgId = await fbCreateAssistantMessage(uid, activeId!, selectedSubject);
      let lastFlushAnswer = '';
      let lastFlushThinking = '';

      const result = await startStream(
        msgsForApi, selectedSubject ? [selectedSubject] : [], visualiseMode, undefined,
        settings.webSearch,
        (fullAnswer, fullThinking, usage) => {
          if (!assistantMsgId) return;
          const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 || fullThinking.length - lastFlushThinking.length > 200;
          if (shouldFlush) {
            lastFlushAnswer = fullAnswer;
            lastFlushThinking = fullThinking;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              fbUpdateAssistantMessage(uid, activeId!, assistantMsgId, { content: fullAnswer, thinkingTrace: fullThinking, tokens: usage ?? null });
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
      if (displayUrl) attachments.push({ id: pf.id, name: pf.file.name, type: pf.file.type, size: pf.file.size, url: displayUrl });
      if (pf.file.type.startsWith('image/')) {
        const match = pf.dataUrl.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
        if (match) imageParts.push({ mimeType: match[1], data: match[2] });
        else imageParts.push({ mimeType: 'image/jpeg', data: pf.dataUrl.split(',')[1] });
      }
    }

    await fbAddUserMessage(uid, convId, text, selectedSubject, attachments.length > 0 ? attachments : undefined);
    setInputText('');
    setPendingFiles([]);
    const assistantMsgId = await fbCreateAssistantMessage(uid, convId, selectedSubject);

    const msgsForApi = messages.concat({
      id: '', role: 'user' as const, content: text, subject: selectedSubject,
      attachments: attachments.length > 0 ? attachments : undefined, thinkingTrace: '', status: 'completed', createdAt: Date.now(),
    }).map(m => ({ role: m.role, text: m.content, attachments: m.attachments }));

    let lastFlushAnswer = '';
    let lastFlushThinking = '';

    const result = await startStream(
      msgsForApi, selectedSubject ? [selectedSubject] : [], visualiseMode,
      imageParts.length > 0 ? imageParts : undefined, settings.webSearch,
      (fullAnswer, fullThinking, usage) => {
        if (!assistantMsgId) return;
        const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 || fullThinking.length - lastFlushThinking.length > 200;
        if (shouldFlush) {
          lastFlushAnswer = fullAnswer;
          lastFlushThinking = fullThinking;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fbUpdateAssistantMessage(uid, convId, assistantMsgId, { content: fullAnswer, thinkingTrace: fullThinking, tokens: usage ?? null });
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
    const handleAutoSend = () => handleSendMessage();
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
      if (e.key === 'ArrowDown') { e.preventDefault(); setAddMenuIndex(p => (p + 1) % 3); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAddMenuIndex(p => (p - 1 + 3) % 3); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (addMenuIndex === 0) fileInputRef.current?.click();
        else if (addMenuIndex === 2) setShowSubjectMenu(true);
        setShowAddMenu(false);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowAddMenu(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSendMessage(); }
    else if (e.key === '/' && inputText.trim() === '') { e.preventDefault(); setShowAddMenu(p => !p); }
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
    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex < 0) return;

    await fbDeleteMessagesFrom(user.uid, activeId, msgId, true);
    const prevMsgs = messages.slice(0, msgIndex);
    const lastUserMsg = [...prevMsgs].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    const msgsForApi = prevMsgs.concat({
      id: '', role: 'user' as const, content: lastUserMsg.content,
      subject: lastUserMsg.subject, attachments: lastUserMsg.attachments,
      thinkingTrace: '', status: 'completed', createdAt: Date.now(),
    }).map(m => ({ role: m.role, text: m.content, attachments: m.attachments }));

    const assistantMsgId = await fbCreateAssistantMessage(user.uid, activeId, lastUserMsg.subject);
    let lastFlushAnswer = '';
    let lastFlushThinking = '';

    const result = await startStream(
      msgsForApi, lastUserMsg.subject ? [lastUserMsg.subject as SubjectTag] : [],
      visualiseMode, undefined, settings.webSearch,
      (fullAnswer, fullThinking, usage) => {
        if (!assistantMsgId) return;
        const shouldFlush = fullAnswer.length - lastFlushAnswer.length > 200 || fullThinking.length - lastFlushThinking.length > 200;
        if (shouldFlush) {
          lastFlushAnswer = fullAnswer;
          lastFlushThinking = fullThinking;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fbUpdateAssistantMessage(user.uid, activeId, assistantMsgId, { content: fullAnswer, thinkingTrace: fullThinking, tokens: usage ?? null });
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
                const MAX_WIDTH = 1200, MAX_HEIGHT = 1200;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
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
      if (m.tokens) total += m.tokens.prompt + m.tokens.completion;
      else total += Math.round((m.content.length + m.thinkingTrace.length) / 4);
    }
    if (streaming && liveTokenUsage) total += liveTokenUsage.prompt + liveTokenUsage.completion;
    return total;
  }, [messages, streaming, liveTokenUsage]);

  const displayMessages = messages;
  const canSend = (!!inputText.trim() || pendingFiles.length > 0) && !streaming && !pendingFiles.some(p => p.uploading);

  if (authLoading) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)' }}>
        <div style={{ color: 'var(--text-faint)', fontSize: '1em' }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <GoogleSignIn />;

  return (
    <div className="pwa-app-fade-in">
      <AppShell
        sidebar={
          <Sidebar
            conversations={conversations}
            activeId={activeId}
            loading={convsLoading}
            onSelect={(id) => setActiveId(id)}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            onNewChat={handleNewChat}
            contextUsed={contextUsed}
          />
        }
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-root)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', gap: 8, flexShrink: 0 }}>
            <UserMenu />
          </div>

          <MessageList
            messages={displayMessages}
            streaming={streaming}
            streamingAnswer={streamingAnswer}
            streamingThinking={streamingThinking}
            searchStatus={searchStatus}
            streamError={streamError}
            streamSources={streamSources}
            tokenUsage={liveTokenUsage}
            onEdit={handleEditMessage}
            onRegenerate={handleRegenerate}
            onFeedback={handleFeedback}
            userDisplayName={user.displayName?.split(' ')[0] ?? 'there'}
            onChipClick={handleChipClick}
          />

          <ChatInputBar
            inputText={inputText}
            setInputText={setInputText}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            showSubjectMenu={showSubjectMenu}
            setShowSubjectMenu={setShowSubjectMenu}
            showAddMenu={showAddMenu}
            setShowAddMenu={setShowAddMenu}
            addMenuIndex={addMenuIndex}
            setAddMenuIndex={setAddMenuIndex}
            editingMsgId={editingMsgId}
            handleCancelEdit={handleCancelEdit}
            pendingFiles={pendingFiles}
            removePendingFile={removePendingFile}
            canSend={canSend}
            streaming={streaming}
            visualiseMode={visualiseMode}
            webSearch={settings.webSearch}
            listening={listening}
            browserSupportsSpeechRecognition={browserSupportsSpeechRecognition}
            toggleVoice={toggleVoice}
            handleSendMessage={handleSendMessage}
            handleKeyDown={handleKeyDown}
            stopStream={stopStream}
            handleSubjectSelect={handleSubjectSelect}
            saveSettings={saveSettings}
            settings={settings}
            handleFileSelect={handleFileSelect}
          />
        </div>
      </AppShell>
    </div>
  );
}
