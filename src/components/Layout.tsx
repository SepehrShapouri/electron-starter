import { ReactNode } from 'react';
import TitleBar from './TitleBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col">
      <TitleBar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
