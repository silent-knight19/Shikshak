import type { FC } from 'react';
import { useState } from 'react';

export interface MessageActionsProps {
  role: 'user' | 'assistant';
  content: string;
  feedback: 'good' | 'bad' | null;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onFeedback: (vote: 'good' | 'bad' | null) => void;
}

const MessageActions: FC<MessageActionsProps> = ({
  role,
  content,
  feedback,
  onEdit,
  onRegenerate,
  onFeedback,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      padding: '0 4px',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }}>
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy response"}
        style={{
          background: 'transparent',
          border: 'none',
          color: copied ? 'var(--accent-blue)' : 'var(--text-faint)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '0.78em',
          fontWeight: 500,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!copied) e.currentTarget.style.color = 'var(--text-muted)';
        }}
        onMouseLeave={(e) => {
          if (!copied) e.currentTarget.style.color = 'var(--text-faint)';
        }}
      >
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Copied!</span>
          </>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {/* Edit Button for User Messages */}
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          title="Edit message"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
          </svg>
        </button>
      )}

      {/* Regenerate Button for Assistant Messages */}
      {!isUser && onRegenerate && (
        <button
          onClick={onRegenerate}
          title="Regenerate response"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-faint)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      )}

      {/* Thumbs Up / Thumbs Down Feedback for Assistant Messages */}
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Like */}
          <button
            onClick={() => onFeedback(feedback === 'good' ? null : 'good')}
            title="Good response"
            style={{
              background: 'transparent',
              border: 'none',
              color: feedback === 'good' ? '#10b981' : 'var(--text-faint)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (feedback !== 'good') e.currentTarget.style.color = '#10b981';
            }}
            onMouseLeave={(e) => {
              if (feedback !== 'good') e.currentTarget.style.color = 'var(--text-faint)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback === 'good' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>

          {/* Dislike */}
          <button
            onClick={() => onFeedback(feedback === 'bad' ? null : 'bad')}
            title="Bad response"
            style={{
              background: 'transparent',
              border: 'none',
              color: feedback === 'bad' ? '#ef4444' : 'var(--text-faint)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (feedback !== 'bad') e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              if (feedback !== 'bad') e.currentTarget.style.color = 'var(--text-faint)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback === 'bad' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageActions;
