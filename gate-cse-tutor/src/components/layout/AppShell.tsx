import type { FC, ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  isMobile?: boolean;
}

const shellSx: React.CSSProperties = {
  width: '100%',
  height: '100vh',
  display: 'flex',
  overflow: 'hidden',
  background: 'var(--bg-root)',
};

const mainSx: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
};

const AppShell: FC<AppShellProps> = ({ sidebar, children, isMobile }) => (
  <div style={shellSx}>
    {!isMobile && sidebar}
    <div style={mainSx}>{children}</div>
  </div>
);

export default AppShell;
