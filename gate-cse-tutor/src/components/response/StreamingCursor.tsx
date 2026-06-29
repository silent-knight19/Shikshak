import type { FC } from 'react';

const StreamingCursor: FC = () => (
  <span style={{
    display: 'inline-block',
    width: 2,
    height: 18,
    background: 'var(--accent-blue)',
    marginLeft: 2,
    verticalAlign: 'text-bottom',
    borderRadius: 1,
    animation: 'blink 1s step-end infinite',
  }} />
);

export default StreamingCursor;
