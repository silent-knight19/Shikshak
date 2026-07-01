import { useState, useRef, useEffect, memo } from 'react';
import type { FirestoreMessage, Source } from '../../store/types';
import MessageBubble from '../response/MessageBubble';
import ThinkingBlock from '../response/ThinkingBlock';
import StreamingCursor from '../response/StreamingCursor';
import LoadingDots from '../response/LoadingDots';
import MarkdownRenderer from '../render/MarkdownRenderer';
import VizFrame from '../response/VizFrame';
import SearchSources from '../response/SearchSources';

interface MessageListProps {
  messages: FirestoreMessage[];
  streaming: boolean;
  streamingAnswer: string;
  streamingThinking: string;
  searchStatus: string;
  streamError: string | null;
  streamSources: Source[];
  tokenUsage: any;
  onEdit: (msg: FirestoreMessage) => void;
  onRegenerate: (msgId: string) => void;
  onFeedback: (msgId: string, vote: 'good' | 'bad' | null) => void;
  userDisplayName: string;
  onChipClick: (text: string) => void;
}

const SUGGESTION_CHIPS = [
  'Explain DFA minimization with an example',
  'Solve: Round Robin scheduling, quantum = 3',
  'Find candidate keys given FDs',
];

function MessageListInner({
  messages, streaming, streamingAnswer, streamingThinking,
  searchStatus, streamError, streamSources, onEdit, onRegenerate, onFeedback,
  userDisplayName, onChipClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userIsNearBottomRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
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
    if (userIsNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingAnswer]);

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div ref={containerRef} style={{
      flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
    }}>
      {showEmpty ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '0 24px', animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            fontSize: 'clamp(1.4em, 5vw, 2.286em)', fontWeight: 400, color: 'var(--text-heading)',
            textAlign: 'center', lineHeight: 1.3, letterSpacing: '-0.02em',
            marginBottom: 40,
          }}>
            Hello, {userDisplayName}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 680,
          }}>
            {SUGGESTION_CHIPS.map((chip) => (
              <button key={chip} onClick={() => onChipClick(chip)} className="suggestion-chip">
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', margin: '0 auto', padding: '24px 6px', flex: 1 }}>
            {messages
              .filter(msg => !(streaming && msg.status === 'streaming'))
              .map(msg => (
                <MessageBubbleItem
                  key={msg.id}
                  msg={msg}
                  streaming={streaming}
                  onEdit={onEdit}
                  onRegenerate={onRegenerate}
                  onFeedback={onFeedback}
                />
              ))}

            {streaming && (
              <StreamingMessage
                searchStatus={searchStatus}
                streamingAnswer={streamingAnswer}
                streamingThinking={streamingThinking}
                streamSources={streamSources}
              />
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
  );
}

const MessageBubbleItem = memo(function MessageBubbleItem({
  msg, streaming, onEdit, onRegenerate, onFeedback,
}: {
  msg: FirestoreMessage; streaming: boolean;
  onEdit: (msg: FirestoreMessage) => void;
  onRegenerate: (msgId: string) => void;
  onFeedback: (msgId: string, vote: 'good' | 'bad' | null) => void;
}) {
  return (
    <MessageBubble
      role={msg.role}
      timestamp={msg.createdAt}
      streaming={streaming && msg.status === 'streaming'}
      actions={msg.status === 'completed' ? {
        role: msg.role,
        content: msg.content,
        feedback: msg.feedback ?? null,
        onEdit: msg.role === 'user' ? () => onEdit(msg) : undefined,
        onRegenerate: msg.role === 'assistant' ? () => onRegenerate(msg.id) : undefined,
        onFeedback: (vote) => onFeedback(msg.id, vote),
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
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
  );
});

const StreamingMessage = memo(function StreamingMessage({
  searchStatus, streamingAnswer, streamingThinking, streamSources,
}: {
  searchStatus: string; streamingAnswer: string; streamingThinking: string; streamSources: Source[];
}) {
  return (
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
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          {searchStatus}
        </div>
      )}
      {streamingThinking && <ThinkingBlock text={streamingThinking} streaming={true} />}
      {!searchStatus && streamingThinking && !streamingAnswer && <LoadingDots />}
      {streamingAnswer ? (
        <>
          {searchStatus && (
            <div style={{
              fontSize: '0.786em', color: 'var(--accent-blue)',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {searchStatus}
            </div>
          )}
          <TypewriterFormatted text={streamingAnswer} streaming={true} />
          <StreamingCursor />
        </>
      ) : !streamingThinking && !searchStatus ? <LoadingDots /> : null}
      {streamSources.length > 0 && <SearchSources sources={streamSources} />}
    </MessageBubble>
  );
});

function TypewriterFormatted({ text, streaming }: { text: string; streaming: boolean }) {
  const [display, setDisplay] = useState('');
  const idxRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const rafRef = useRef<number>(0);
  const textRef = useRef(text);
  textRef.current = text;

  wordsRef.current = text.match(/\S+\s*/g) ?? (text ? [text] : []);

  useEffect(() => {
    idxRef.current = 0;
    setDisplay('');

    if (!streaming) {
      setDisplay(textRef.current);
      return;
    }

    let lastTick = performance.now();
    const tick = (now: number) => {
      rafRef.current = 0;
      if (now - lastTick >= 30) {
        lastTick = now;
        if (idxRef.current < wordsRef.current.length) {
          idxRef.current += Math.min(2, wordsRef.current.length - idxRef.current);
          setDisplay(wordsRef.current.slice(0, idxRef.current).join(''));
        }
      }
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

const MessageList = memo(MessageListInner);
export default MessageList;
