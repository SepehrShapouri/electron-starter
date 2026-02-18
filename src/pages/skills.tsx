import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
        <section className="space-y-3" aria-label="Skills list">
          {skills.map(skill => {
            const isTogglePending =
              toggleMutation.isPending &&
              toggleMutation.variables?.skillKey === skill.skillKey;
            const isInstallPending =
              installMutation.isPending &&
              installMutation.variables?.skillKey === skill.skillKey;

            return (
              <SkillCard
                key={skill.skillKey}
                skill={skill}
                togglePending={isTogglePending}
                installPending={isInstallPending}
                onOpenDetails={() => openDetails(skill.skillKey)}
                onToggle={enabled =>
                  toggleMutation.mutate({ skillKey: skill.skillKey, enabled })
                }
                onInstall={installId =>
                  installMutation.mutate({
                    skillKey: skill.skillKey,
                    name: skill.name,
                    installId,
                    timeoutMs: 120000,
                  })
                }
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
        isInstalling={
          Boolean(selectedSkill) &&
          installMutation.isPending &&
          installMutation.variables?.skillKey === selectedSkill?.skillKey
        }
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
  togglePending,
  installPending,
  onOpenDetails,
  onToggle,
  onInstall,
}: {
  skill: SkillStatusEntry;
  togglePending: boolean;
  installPending: boolean;
  onOpenDetails: () => void;
  onToggle: (enabled: boolean) => void;
  onInstall: (installId: string) => void;
}) {
  const source = displaySource(skill);
  const enabled = !skill.disabled;
  const installOptions = skill.bundled ? skill.install ?? [] : [];
  const gating = collectGatingInfo(skill);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={onOpenDetails}
            aria-label={`Open details for ${skill.name}`}
          >
            <CardTitle className="text-base leading-6">
              {skill.emoji ? `${skill.emoji} ` : ''}
              {skill.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{skill.description}</CardDescription>
          </button>
          <div className="flex items-center gap-2">
            <label
              htmlFor={`skill-enabled-${skill.skillKey}`}
              className="text-sm text-muted-foreground"
            >
              Enabled
            </label>
            <Switch
              id={`skill-enabled-${skill.skillKey}`}
              checked={enabled}
              disabled={togglePending || installPending}
              onCheckedChange={checked => onToggle(Boolean(checked))}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" size="sm">
            {source}
          </Badge>
          <Badge variant={enabled ? 'secondarySuccess' : 'secondary'} size="sm">
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          {skill.eligible ? (
            <Badge variant="secondarySuccess" size="sm">
              Ready
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              Needs setup
            </Badge>
          )}
        </div>

        {gating.length > 0 ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {gating.slice(0, 3).map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {installOptions.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={togglePending || installPending}
              onClick={() => onInstall(installOptions[0].id)}
            >
              {installPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Installing
                </>
              ) : (
                installOptions[0].label
              )}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={onOpenDetails}>
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillDetailsSheet({
  open,
  onOpenChange,
  skill,
  installPendingSkillKey,
  installResult,
  isInstalling,
  onInstall,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: SkillStatusEntry | null;
  installPendingSkillKey: string | null | undefined;
  installResult: { ok?: boolean; message?: string } | null;
  isInstalling: boolean;
  onInstall: (installId: string) => void;
}) {
  const installOptions = skill?.bundled ? skill.install ?? [] : [];
  const gating = skill ? collectGatingInfo(skill) : [];
  const enabled = skill ? !skill.disabled : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>{skill?.name ?? 'Skill details'}</SheetTitle>
          <SheetDescription>
            {skill ? skill.description : 'Select a skill to see details.'}
          </SheetDescription>
        </SheetHeader>

        {skill ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <div className="space-y-3 border-b py-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>{displaySource(skill)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{enabled ? 'Enabled' : 'Disabled'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Skill key</dt>
                  <dd className="truncate text-right">{skill.skillKey}</dd>
                </div>
              </dl>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
              {gating.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Needs</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {gating.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {installOptions.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Install</p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    This runs on your gateway machine and may take a minute.
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
                        (installResult.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5')
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
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-medium">Metadata</p>
                <pre className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-5">
                  {JSON.stringify(skill, null, 2)}
                </pre>
              </div>
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

function collectGatingInfo(skill: SkillStatusEntry): string[] {
  const items: string[] = [];

  if (skill.blockedByAllowlist) {
    items.push('Blocked by allowlist');
  }
  if (!skill.eligible) {
    items.push('Not ready yet');
  }

  const missingBins = skill.missing?.bins ?? [];
  if (missingBins.length > 0) {
    items.push(`Missing tools: ${missingBins.join(', ')}`);
  }

  const missingEnv = skill.missing?.env ?? [];
  if (missingEnv.length > 0) {
    items.push(`Missing env vars: ${missingEnv.join(', ')}`);
  }

  const missingConfig = skill.missing?.config ?? [];
  if (missingConfig.length > 0) {
    items.push(`Missing config: ${missingConfig.join(', ')}`);
  }

  const missingOs = skill.missing?.os ?? [];
  if (missingOs.length > 0) {
    items.push(`Unsupported OS: ${missingOs.join(', ')}`);
  }

  const configChecks = skill.configChecks ?? [];
  const failedChecks = configChecks
    .filter(check => !check.satisfied)
    .map(check => check.path);
  if (failedChecks.length > 0) {
    items.push(`Config checks: ${failedChecks.join(', ')}`);
  }

  return items;
}

function displaySource(skill: SkillStatusEntry): string {
  if (skill.bundled || skill.source.includes('bundled')) return 'Bundled';
  if (skill.source.includes('managed')) return 'Managed';
  if (skill.source.includes('workspace')) return 'Workspace';
  return skill.source || 'Unknown';
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-label="Loading skills">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="gap-3 py-4">
          <CardHeader className="space-y-2 px-4 sm:px-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-2 px-4 sm:px-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
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
