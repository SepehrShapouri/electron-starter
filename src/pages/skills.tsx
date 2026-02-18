import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  getGatewaySkillsStatus,
  installGatewaySkill,
  updateGatewaySkillEnabled,
} from '@/lib/gateway-skills';
import { LOCAL_GATEWAY_CONFIG } from '@/lib/local-gateway-config';
import type { SkillStatusEntry } from '@/lib/skills-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const gatewayConfig = LOCAL_GATEWAY_CONFIG;
  const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [installResult, setInstallResult] = useState<{ ok?: boolean; message?: string } | null>(
    null
  );

  const statusQuery = useQuery({
    queryKey: ['skills-status', gatewayConfig.gatewayUrl],
    queryFn: () => getGatewaySkillsStatus(gatewayConfig),
  });

  const toggleMutation = useMutation({
    mutationFn: (params: { skillKey: string; enabled: boolean }) =>
      updateGatewaySkillEnabled(gatewayConfig, params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['skills-status', gatewayConfig.gatewayUrl],
      });
    },
  });

  const installMutation = useMutation({
    mutationFn: (params: {
      skillKey: string;
      name: string;
      installId: string;
      timeoutMs?: number;
    }) =>
      installGatewaySkill(gatewayConfig, {
        name: params.name,
        installId: params.installId,
        timeoutMs: params.timeoutMs,
      }),
    onMutate: () => {
      setInstallResult(null);
    },
    onSuccess: async res => {
      setInstallResult({ ok: res.ok, message: res.message });
      await queryClient.invalidateQueries({
        queryKey: ['skills-status', gatewayConfig.gatewayUrl],
      });
      await queryClient.refetchQueries({
        queryKey: ['skills-status', gatewayConfig.gatewayUrl],
      });
    },
    onError: err => {
      setInstallResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    },
  });

  const skills = statusQuery.data?.skills ?? [];
  const selectedSkill = useMemo(
    () => skills.find(skill => skill.skillKey === selectedSkillKey) ?? null,
    [skills, selectedSkillKey]
  );

  const openDetails = (skillKey: string) => {
    setSelectedSkillKey(skillKey);
    setInstallResult(null);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedSkillKey(null);
      setInstallResult(null);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-auto px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">Skills available for this app.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => statusQuery.refetch()}
          disabled={statusQuery.isFetching}
        >
          {statusQuery.isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </header>

      {statusQuery.isLoading ? (
        <LoadingState />
      ) : statusQuery.isError ? (
        <ErrorState
          message={
            statusQuery.error instanceof Error
              ? statusQuery.error.message
              : 'Unable to load skills.'
          }
          onRetry={() => statusQuery.refetch()}
          isRetrying={statusQuery.isFetching}
        />
      ) : skills.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3"
          aria-label="Skills list"
        >
          {skills.map(skill => {
            return (
              <SkillCard
                key={skill.skillKey}
                skill={skill}
                onOpenDetails={() => openDetails(skill.skillKey)}
              />
            );
          })}
        </section>
      )}

      {toggleMutation.isError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not update skill</AlertTitle>
          <AlertDescription>
            {toggleMutation.error instanceof Error
              ? toggleMutation.error.message
              : 'Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {installMutation.isError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not install skill</AlertTitle>
          <AlertDescription>
            {installMutation.error instanceof Error
              ? installMutation.error.message
              : 'Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <SkillDetailsSheet
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        skill={selectedSkill}
        installPendingSkillKey={
          installMutation.isPending ? installMutation.variables?.skillKey : null
        }
        installResult={
          selectedSkill && installMutation.variables?.skillKey === selectedSkill.skillKey
            ? installResult
            : null
        }
        togglePendingSkillKey={toggleMutation.isPending ? toggleMutation.variables?.skillKey : null}
        isInstalling={
          Boolean(selectedSkill) &&
          installMutation.isPending &&
          installMutation.variables?.skillKey === selectedSkill?.skillKey
        }
        onToggle={enabled => {
          if (!selectedSkill) {
            return;
          }
          toggleMutation.mutate({ skillKey: selectedSkill.skillKey, enabled });
        }}
        onInstall={installId => {
          if (!selectedSkill) {
            return;
          }
          installMutation.mutate({
            skillKey: selectedSkill.skillKey,
            name: selectedSkill.name,
            installId,
            timeoutMs: 120000,
          });
        }}
      />
    </div>
  );
}

function SkillCard({
  skill,
  onOpenDetails,
}: {
  skill: SkillStatusEntry;
  onOpenDetails: () => void;
}) {
  const status = resolveSkillStatus(skill);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails();
        }
      }}
      className="rounded-xl p-4 transition-colors hover:bg-neutral-a3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open details for ${skill.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {skill.emoji ? `${skill.emoji} ` : ''}
            {skill.name}
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{skill.description}</p>
        </div>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

function SkillDetailsSheet({
  open,
  onOpenChange,
  skill,
  togglePendingSkillKey,
  installPendingSkillKey,
  installResult,
  isInstalling,
  onToggle,
  onInstall,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillStatusEntry | null;
  togglePendingSkillKey: string | null | undefined;
  installPendingSkillKey: string | null | undefined;
  installResult: { ok?: boolean; message?: string } | null;
  isInstalling: boolean;
  onToggle: (enabled: boolean) => void;
  onInstall: (installId: string) => void;
}) {
  const installOptions = skill?.install ?? [];
  const needs = skill ? describeSkillNeeds(skill) : [];
  const enabled = skill ? !skill.disabled : false;
  const status = skill ? resolveSkillStatus(skill) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>{skill?.name ?? 'Skill details'}</SheetTitle>
          <SheetDescription>
            {skill ? skill.description : 'Choose a skill from the list to see details.'}
          </SheetDescription>
        </SheetHeader>

        {skill ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <div className="space-y-3 border-b py-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    {status ? <StatusPill status={status} /> : null}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Enabled</dt>
                  <dd className="flex items-center gap-2">
                    <Switch
                      id={`skill-enabled-${skill.skillKey}`}
                      checked={enabled}
                      disabled={togglePendingSkillKey === skill.skillKey || isInstalling}
                      onCheckedChange={checked => onToggle(Boolean(checked))}
                    />
                    <span>{enabled ? 'On' : 'Off'}</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
              {needs.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">What it needs</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {needs.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
                  This skill already has everything it needs on this machine.
                </div>
              )}

              {installOptions.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Install</p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Run setup actions for this skill on your gateway machine.
                  </p>

                  <div className="space-y-2">
                    {installOptions.map(option => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => onInstall(option.id)}
                        disabled={installPendingSkillKey === skill.skillKey}
                      >
                        {installPendingSkillKey === skill.skillKey ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Installing
                          </>
                        ) : (
                          option.label
                        )}
                      </Button>
                    ))}
                  </div>

                  {isInstalling ? (
                    <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                      Installing… (waiting for gateway)
                    </div>
                  ) : installResult ? (
                    <div
                      className={
                        "mt-3 rounded-md border p-3 text-sm " +
                        (installResult.ok
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-destructive/30 bg-destructive/5')
                      }
                    >
                      <div className="font-medium">
                        {installResult.ok ? 'Install complete' : 'Install failed'}
                      </div>
                      {installResult.message ? (
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                          {installResult.message}
                        </pre>
                      ) : null}
                      {installResult.ok ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Current status: {resolveSkillStatus(skill)}.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground">Select a skill from the list.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function resolveSkillStatus(skill: SkillStatusEntry): 'Ready' | 'Needs setup' | 'Disabled' {
  if (skill.disabled) {
    return 'Disabled';
  }
  if (skill.eligible && !skill.blockedByAllowlist) {
    return 'Ready';
  }
  return 'Needs setup';
}

function StatusPill({ status }: { status: 'Ready' | 'Needs setup' | 'Disabled' }) {
  return (
    <Badge
      size="sm"
      variant={
        status === 'Ready'
          ? 'secondarySuccess'
          : status === 'Needs setup'
            ? 'secondaryWarning'
            : 'secondary'
      }
      className="shrink-0"
    >
      {status}
    </Badge>
  );
}

function describeSkillNeeds(skill: SkillStatusEntry): string[] {
  const items: string[] = [];

  if (skill.blockedByAllowlist) {
    items.push('This skill is currently blocked by your allowlist settings.');
  }

  const missingBins = skill.missing?.bins ?? [];
  if (missingBins.length > 0) {
    items.push(`Install command-line tools: ${missingBins.join(', ')}.`);
  }

  const missingEnv = skill.missing?.env ?? [];
  if (missingEnv.length > 0) {
    items.push(`Set environment variables: ${missingEnv.join(', ')}.`);
  }

  const missingConfig = skill.missing?.config ?? [];
  if (missingConfig.length > 0) {
    items.push(`Add required config values: ${missingConfig.join(', ')}.`);
  }

  const missingOs = skill.missing?.os ?? [];
  if (missingOs.length > 0) {
    items.push(`Use a supported operating system: ${missingOs.join(', ')}.`);
  }

  const configChecks = skill.configChecks ?? [];
  const failedChecks = configChecks
    .filter(check => !check.satisfied)
    .map(check => check.path);
  if (failedChecks.length > 0) {
    items.push(`Fix configuration files: ${failedChecks.join(', ')}.`);
  }

  if (items.length === 0 && !skill.eligible) {
    items.push('This skill still needs setup before it can run on this machine.');
  }

  return items;
}

function LoadingState() {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading skills"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="gap-2 py-8">
      <CardHeader className="items-center px-6 text-center">
        <CardTitle className="text-base">No skills found</CardTitle>
        <CardDescription>Skills will appear here when available.</CardDescription>
      </CardHeader>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle className="text-base">Could not load skills</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Button type="button" variant="outline" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrying
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
