import type { FC, ReactNode } from 'react';
import MessageActions from './MessageActions';
import type { MessageActionsProps } from './MessageActions';
import { useAuth } from '../../firebase/auth';

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
  const { user } = useAuth();
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
          fontSize: '0.8em',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {isUser ? (
            <>{user?.displayName || 'You'} {user?.photoURL ? <img src={user.photoURL} alt="User" style={{width: 28, height: 28, borderRadius: '50%', objectFit: 'cover'}} /> : <div style={{width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-blue)', color: '#131314', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{(user?.displayName || 'U').charAt(0).toUpperCase()}</div>}</>
          ) : (
            <><img src="/shikshak-logo.png" alt="Shikshak" style={{width: 28, height: 28, borderRadius: '6px', objectFit: 'cover'}} /> Shikshak</>
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
