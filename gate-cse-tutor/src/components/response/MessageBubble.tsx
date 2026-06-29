import type { FC, ReactNode } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  children: ReactNode;
}

const MessageBubble: FC<MessageBubbleProps> = ({ role, children }) => (
  <div style={{
    marginBottom: 24,
    animation: role === 'user' ? 'fadeInRight 0.2s ease' : 'fadeInLeft 0.2s ease',
  }}>
    {role === 'user' ? (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <div style={{
          maxWidth: '70%',
          background: 'var(--bg-surface)',
          borderRadius: '20px 20px 6px 20px',
          padding: '10px 16px',
          color: 'var(--text-user)',
          fontSize: 14,
          lineHeight: 1.65,
        }}>
          {children}
        </div>
      </div>
    ) : (
      <div style={{
        color: 'var(--text-primary)',
        fontSize: 14,
        lineHeight: 1.75,
        width: '100%',
      }}>
        {children}
      </div>
    )}
  </div>
);

export default MessageBubble;
