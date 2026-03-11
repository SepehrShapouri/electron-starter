import { BarsSpinner } from '@/components/bars-spinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AgentFileName,
  GatewayAgentFileListEntry,
  getGatewayAgentFile,
  setGatewayAgentFile,
} from '@/lib/gateway-files';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sileo } from 'sileo';

export function FileView({
  selectedFile,
  onBack,
}: {
  selectedFile: GatewayAgentFileListEntry | null;
  onBack: () => void;
}) {
  const { gatewayConfig } = useGatewayProvision();
  const [draft, setDraft] = useState('');
  const [loadedContent, setLoadedContent] = useState('');
  const { data: file, isLoading } = useQuery({
    queryKey: ['agent-file', gatewayConfig?.gatewayUrl, selectedFile?.name],
    queryFn: () =>
      getGatewayAgentFile(gatewayConfig!, {
        agentId: 'main',
        name: selectedFile?.name as AgentFileName,
      }),
    enabled: Boolean(gatewayConfig && selectedFile),
  });

  useEffect(() => {
    if (typeof file !== 'string') {
      return;
    }

    setLoadedContent(file);
    setDraft(file);
  }, [file, selectedFile?.name]);

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      setGatewayAgentFile(gatewayConfig!, {
        agentId: 'main',
        name: selectedFile?.name as AgentFileName,
        content,
      }),
    onError: error => {
      sileo.error({
        title: 'Failed to save',
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSuccess: (_data, content) => {
      setLoadedContent(content);
      sileo.success({
        title: 'File saved',
        description: selectedFile?.name,
      });
    },
  });

  const isDirty = draft !== loadedContent;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <BarsSpinner size={24} />
      </div>
    );
  }
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="p-4 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft />
          </Button>
          <p className="text-base font-medium">{selectedFile?.name}</p>
        </div>
        <Textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          className="border-none shadow-none outline-none rounded-none focus-visible:ring-0 resize-none h-full font-mono flex-1"
        />
      </div>
      <div className="p-4 flex justify-end items-center w-full gap-2">
        <Button
          variant="ghost"
          onClick={() => setDraft(loadedContent)}
          disabled={!isDirty || saveMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate(draft)}
          disabled={!isDirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving changes
            </>
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </div>
  );
}
