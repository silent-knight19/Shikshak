import type { FC, ReactNode } from 'react';
import MessageActions from './MessageActions';
import type { MessageActionsProps } from './MessageActions';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  children: ReactNode;
  timestamp?: number;
  actions?: MessageActionsProps;
  streaming?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

const MessageBubble: FC<MessageBubbleProps> = ({ role, children, timestamp, actions, streaming }) => {
  const isUser = role === 'user';
  return (
    <div className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}>
      <div style={{
        marginBottom: 32,
        animation: 'fadeIn 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
      }}>
        <div style={{
          color: 'var(--text-muted)',
          marginBottom: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {isUser ? (
            <>You <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-blue)', color: '#131314', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>U</div></>
          ) : (
            <><div style={{width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg></div> AI Tutor</>
          )}
        </div>
        <div className={`message-bubble-wrapper ${isUser ? 'message-user-wrapper' : 'message-assistant-wrapper'}`}>
          <div style={{
            background: isUser ? 'var(--bg-surface)' : 'transparent',
            padding: isUser ? '16px 20px' : '0',
            borderRadius: '16px',
            borderTopRightRadius: isUser ? '4px' : '16px',
            borderTopLeftRadius: !isUser ? '4px' : '16px',
            maxWidth: isUser ? '85%' : '100%',
            width: isUser ? 'auto' : '100%',
            border: isUser ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          }}>
            {children}
          </div>
          {!streaming && actions && (
            <MessageActions
              role={role}
              content={actions.content}
              feedback={actions.feedback}
              onEdit={actions.onEdit}
              onRegenerate={actions.onRegenerate}
              onFeedback={actions.onFeedback}
            />
          )}
        </div>
        {timestamp && !streaming && (
          <div className="message-timestamp">{formatTime(timestamp)}</div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
