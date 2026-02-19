import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { AgentFileName } from '@/lib/gateway-files';
import {
  getGatewayAgentFile,
  listGatewayAgentFiles,
  setGatewayAgentFile,
} from '@/lib/gateway-files';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, File, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sileo } from 'sileo';

export default function SettingsPage() {
  const { provisionQuery, gatewayConfig } = useGatewayProvision();
  const [selectedFile, setSelectedFile] = useState<AgentFileName | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadedContent, setLoadedContent] = useState<Record<string, string>>(
    {}
  );
  const [loadedOnce, setLoadedOnce] = useState<Record<string, boolean>>({});

  const fileListQuery = useQuery({
    queryKey: ['agent-files-list', gatewayConfig?.gatewayUrl],
    queryFn: () =>
      listGatewayAgentFiles(gatewayConfig!, {
        agentId: 'main',
      }),
    enabled: Boolean(gatewayConfig),
  });

  const listedFiles = fileListQuery.data ?? [];
  const selectableFiles = listedFiles.filter(file => !file.missing);

  useEffect(() => {
    if (selectableFiles.length === 0) {
      if (selectedFile !== null) {
        setSelectedFile(null);
      }
      return;
    }

    if (
      !selectedFile ||
      !selectableFiles.some(file => file.name === selectedFile)
    ) {
      setSelectedFile(selectableFiles[0].name);
    }
  }, [selectedFile, selectableFiles]);

  const fileQuery = useQuery({
    queryKey: ['agent-file', gatewayConfig?.gatewayUrl, selectedFile],
    queryFn: () =>
      getGatewayAgentFile(gatewayConfig!, {
        agentId: 'main',
        name: selectedFile as AgentFileName,
      }),
    enabled: Boolean(gatewayConfig && selectedFile),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { name: AgentFileName; content: string }) =>
      setGatewayAgentFile(gatewayConfig!, {
        agentId: 'main',
        name: payload.name,
        content: payload.content,
      }),
    onMutate: variables => {
      const previousLoaded = loadedContent[variables.name] ?? '';
      setLoadedContent(prev => ({
        ...prev,
        [variables.name]: variables.content,
      }));
      return { previousLoaded };
    },
    onError: (_error, variables, context) => {
      if (!context) {
        return;
      }
      setLoadedContent(prev => ({
        ...prev,
        [variables.name]: context.previousLoaded,
      }));
    },
    onSuccess: (_data, variables) => {
      sileo.success({
        title: 'File saved',
        description: variables.name,
      });
    },
  });

  useEffect(() => {
    if (
      !selectedFile ||
      fileQuery.data === undefined ||
      loadedOnce[selectedFile]
    ) {
      return;
    }
    setLoadedContent(prev => ({
      ...prev,
      [selectedFile]: fileQuery.data,
    }));
    setDrafts(prev => ({
      ...prev,
      [selectedFile]: fileQuery.data,
    }));
    setLoadedOnce(prev => ({
      ...prev,
      [selectedFile]: true,
    }));
  }, [fileQuery.data, loadedOnce, selectedFile]);

  const displayedContent =
    selectedFile !== null ? (drafts[selectedFile] ?? '') : '';

  const isDirty =
    selectedFile !== null &&
    displayedContent !== (loadedContent[selectedFile] ?? '');

  const updateDraft = (value: string) => {
    if (!selectedFile) {
      return;
    }
    setDrafts(prev => ({
      ...prev,
      [selectedFile]: value,
    }));
  };

  if (!gatewayConfig && provisionQuery.isLoading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-32" />
        <div className="mt-4 grid h-[520px] grid-cols-[220px_1fr] gap-3">
          <Skeleton className="h-full rounded-lg" />
          <Skeleton className="h-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!gatewayConfig && provisionQuery.isError) {
    return (
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-auto px-4 py-6 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load settings</AlertTitle>
          <AlertDescription>
            {provisionQuery.error instanceof Error
              ? provisionQuery.error.message
              : 'Gateway access is not available.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            selectedFile &&
            saveMutation.mutate({
              name: selectedFile,
              content: displayedContent,
            })
          }
          disabled={
            !selectedFile ||
            !isDirty ||
            saveMutation.isPending ||
            fileQuery.isLoading
          }
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] rounded-lg shadow-fancy">
        <aside className="bg-sidebar-primary rounded-l-lg border-r">
          <div className='p-3 border-b'>
            <p className="text-base font-medium text-muted-foreground">Files</p>
          </div>
          {fileListQuery.isLoading ? (
            <div className="space-y-1 px-2">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
          ) : fileListQuery.isError ? (
            <p className="px-2 text-xs text-red-11">Failed to load files</p>
          ) : listedFiles.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">
              No files returned.
            </p>
          ) : (
            <div className="space-y-1 p-2 ">
              {listedFiles.map(file => {
                const { name, missing } = file;
                const active = name === selectedFile;
                const dirty =
                  !missing &&
                  (drafts[name] ?? '') !== (loadedContent[name] ?? '');
                return (
                  <Button
                    variant="ghost"
                    key={name}
                    type="button"
                    onClick={() => setSelectedFile(name)}
                    disabled={missing}
                    className={`flex w-full items-center justify-between rounded-sm active:scale-99 cursor-pointer px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? 'bg-neutral-a4 text-foreground'
                        : 'text-foreground hover:bg-neutral-a3'
                    } disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent`}
                  >
                    <span className="flex items-center gap-2">
                      <File /> {name}
                    </span>
                    <span className="flex items-center gap-2">
                      {missing ? (
                        <Badge variant="secondary" size="sm">
                          Missing
                        </Badge>
                      ) : null}
                      {dirty ? (
                        <span className="h-2 w-2 rounded-full bg-blue-9" />
                      ) : null}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="flex min-h-0 flex-col rounded-r-lg bg-background-2">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="text-base text-muted-foreground">
              {selectedFile ?? 'No file selected'}
            </p>
          </div>
          {fileListQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to load files</AlertTitle>
                <AlertDescription>
                  {fileListQuery.error instanceof Error
                    ? fileListQuery.error.message
                    : 'Please try again.'}
                </AlertDescription>
              </Alert>
            </div>
          ) : selectableFiles.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No editable workspace files found for agent main.
            </div>
          ) : !selectedFile || fileQuery.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-[420px] w-full rounded-md" />
            </div>
          ) : fileQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to load file</AlertTitle>
                <AlertDescription>
                  {fileQuery.error instanceof Error
                    ? fileQuery.error.message
                    : 'Please try again.'}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <Textarea
                value={displayedContent}
                onChange={event => updateDraft(event.target.value)}
                className="h-full min-h-[420px] font-mono text-sm"
              />
            </div>
          )}
        </section>
      </div>

      {saveMutation.isError ? (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to save</AlertTitle>
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : 'Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
