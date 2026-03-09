import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IntegrationCard } from '@/features/integrations/components/integration-card';
import { IntegrationDetailsSheet } from '@/features/integrations/components/integration-details-sheet';
import {
  IntegrationErrorState,
  IntegrationSearchEmptyState,
} from '@/features/integrations/components/integration-states';
import {
  STATIC_INTEGRATIONS,
  type Integration,
  type IntegrationStatus,
} from '@/features/integrations/constants';
import {
  matchesIntegrationSearch,
  resolveStatuses,
} from '@/features/integrations/utils';
import { integrationsApi } from '@/lib/integrations-api';
import { useQuery } from '@tanstack/react-query';
import gsap from 'gsap';
import { Puzzle, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export default function IntegrationsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const searchInputId = useId();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const statusQuery = useQuery({
    queryKey: ['integrations-status'],
    queryFn: () => integrationsApi.getComposioStatus(),
    refetchOnWindowFocus: true,
  });

  const { statuses, byToolkit } = useMemo(() => {
    if (!statusQuery.data) {
      return {
        statuses: Object.fromEntries(
          STATIC_INTEGRATIONS.map(({ id }) => [
            id,
            'loading' as IntegrationStatus,
          ])
        ),
        byToolkit: Object.fromEntries(
          STATIC_INTEGRATIONS.map(({ id }) => [id, []])
        ),
      };
    }
    return resolveStatuses(statusQuery.data, STATIC_INTEGRATIONS);
  }, [statusQuery.data]);

  const integrations: Integration[] = useMemo(
    () =>
      STATIC_INTEGRATIONS.map(integration => ({
        ...integration,
        status: statuses[integration.id] ?? 'not_connected',
      })),
    [statuses]
  );

  const filteredIntegrations = useMemo(
    () =>
      integrations.filter(integration =>
        matchesIntegrationSearch(integration, searchQuery)
      ),
    [integrations, searchQuery]
  );

  const selectedIntegration = useMemo(
    () => integrations.find(i => i.id === selectedId) ?? null,
    [integrations, selectedId]
  );

  const selectedAccounts = selectedId ? (byToolkit[selectedId] ?? []) : [];
  const hasSearchQuery = searchQuery.trim().length > 0;

  // Page entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          headerRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
        )
        .fromTo(
          gridRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
          '-=0.2'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Sync connection after OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') !== 'success') return;

    void statusQuery.refetch();

    params.delete('status');
    params.delete('connected_account_id');
    const nextQuery = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSheet = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedId(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
    document.getElementById(searchInputId)?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6"
    >
      <header ref={headerRef} className="mb-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-muted p-2">
            <Puzzle
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Integrations
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Connect external services to extend your assistant&apos;s
              capabilities.
            </p>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <label htmlFor={searchInputId} className="sr-only">
            Search integrations
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={searchInputId}
              type="text"
              role="searchbox"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search integrations, tools, or capabilities"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search integrations"
              className="h-10 bg-floated pl-9 pr-10"
            />
            {hasSearchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                aria-label="Clear search"
                className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {statusQuery.isError ? (
        <IntegrationErrorState
          message={
            statusQuery.error instanceof Error
              ? statusQuery.error.message
              : 'Failed to load integrations.'
          }
          onRetry={() => statusQuery.refetch()}
          isRetrying={statusQuery.isFetching}
        />
      ) : filteredIntegrations.length === 0 ? (
        <IntegrationSearchEmptyState
          query={searchQuery.trim()}
          onClear={() => setSearchQuery('')}
        />
      ) : (
        <section
          ref={gridRef}
          className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Available integrations"
        >
          {filteredIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onOpen={() => openSheet(integration.id)}
            />
          ))}
        </section>
      )}

      <IntegrationDetailsSheet
        integration={selectedIntegration}
        accounts={selectedAccounts}
        open={sheetOpen}
        isRefreshing={statusQuery.isRefetching}
        onOpenChange={handleSheetOpenChange}
      />
    </div>
  );
}
