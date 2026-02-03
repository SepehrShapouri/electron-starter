'use client';

import { SidebarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import logoUrl from '../assets/clawpilot-full.png';
export function TitleBar() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b" style={
      {
        WebkitAppRegion: 'drag',
      } as React.CSSProperties
    }>
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4 ml-20">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <img src={logoUrl} className='h-5'/>
      </div>
    </header>
  );
}
