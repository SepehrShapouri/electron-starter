import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
