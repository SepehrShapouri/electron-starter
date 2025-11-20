import { Link, useLocation } from '@tanstack/react-router';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { ReactNode } from 'react';
import TitleBar from './TitleBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="h-screen bg-background flex flex-col">
      <TitleBar />
      <nav className="border-b border-border bg-card flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Electron + shadcn/ui</h1>
            <div className="flex items-center gap-2">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to="/">Home</Link>
              </Button>
              <Button
                variant={location.pathname === '/about' ? 'default' : 'ghost'}
                size="sm"
                asChild
              >
                <Link to="/about">About</Link>
              </Button>
              <Button
                variant={
                  location.pathname === '/settings' ? 'default' : 'ghost'
                }
                size="sm"
                asChild
              >
                <Link to="/settings">Settings</Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 h-full">
          <div className="h-full overflow-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
