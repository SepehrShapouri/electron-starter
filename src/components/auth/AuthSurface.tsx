import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AuthSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export default function AuthSurface({ children, className }: AuthSurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-card p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]',
        className
      )}
    >
      {children}
    </div>
  );
}
