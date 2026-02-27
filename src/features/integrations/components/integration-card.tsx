import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import {
  INTEGRATION_ICONS,
  STATUS_CONFIG,
  type Integration,
  type IntegrationStatus,
} from '../constants';

export function IntegrationCard({
  integration,
  onOpen,
}: {
  integration: Integration;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  const Icon = INTEGRATION_ICONS[integration.id];
  const isLoading = integration.status === 'loading';
  const isDisabled = integration.status === 'coming_soon';
  const statusConfig = isLoading
    ? null
    : STATUS_CONFIG[
        integration.status as Exclude<IntegrationStatus, 'loading'>
      ];

  const handleMouseEnter = () => {
    gsap.to(iconRef.current, {
      scale: 1.08,
      duration: 0.25,
      ease: 'power2.out',
    });
    gsap.to(arrowRef.current, {
      x: 3,
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    gsap.to(iconRef.current, { scale: 1, duration: 0.3, ease: 'power2.out' });
    gsap.to(arrowRef.current, {
      x: 0,
      opacity: 0.4,
      duration: 0.2,
      ease: 'power2.out',
    });
  };

  const handleMouseDown = () => {
    gsap.to(cardRef.current, {
      scale: 0.985,
      duration: 0.1,
      ease: 'power2.out',
    });
  };

  const handleMouseUp = () => {
    gsap.to(cardRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' });
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={`Open ${integration.name} integration details`}
      aria-disabled={isDisabled}
      onClick={!isDisabled ? onOpen : undefined}
      onKeyDown={event => {
        if ((event.key === 'Enter' || event.key === ' ') && !isDisabled) {
          event.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ touchAction: 'manipulation' }}
      className={[
        'group relative cursor-pointer rounded-xl p-4',
        'transition-colors duration-150 hover:bg-neutral-a3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDisabled ? 'cursor-default opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            ref={iconRef}
            className={`shrink-0 rounded-lg p-2 ${integration.bgColor}`}
            style={{ transformOrigin: 'center' }}
          >
            {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-sm font-semibold leading-tight">
              {integration.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {integration.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
          {isLoading ? (
            <Skeleton className="h-4 w-16 rounded-full" />
          ) : statusConfig ? (
            <Badge
              size="sm"
              variant={statusConfig.variant}
              className="shrink-0"
            >
              {statusConfig.label}
            </Badge>
          ) : null}
          <div ref={arrowRef} style={{ opacity: 0.4 }} aria-hidden="true">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
