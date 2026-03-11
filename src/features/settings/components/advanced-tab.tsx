import { BarsSpinner } from '@/components/bars-spinner';
import IconFileBend from '@/components/icons/IconFileBend.svg';
import { Button } from '@/components/ui/button';
import {
  GatewayAgentFileListEntry,
  listGatewayAgentFiles,
} from '@/lib/gateway-files';
import { useGatewayProvision } from '@/lib/use-gateway-provision';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FileView } from './file-view';

function AdvancedTab() {
  const { gatewayConfig } = useGatewayProvision();
  const [selectedFile, setSelectedFile] =
    useState<GatewayAgentFileListEntry | null>(null);
  const [view, setView] = useState<'file' | 'files'>('files');
  const { data: files, isLoading } = useQuery({
    queryKey: ['agent-files-list', gatewayConfig?.gatewayUrl],
    queryFn: () =>
      listGatewayAgentFiles(gatewayConfig!, {
        agentId: 'main',
      }),
    enabled: Boolean(gatewayConfig),
  });
  const handleSelectFile = (file: GatewayAgentFileListEntry) => {
    setSelectedFile(file);
    setView('file');
  };
  const handleBack = () => {
    setSelectedFile(null);
    setView('files');
  };
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <BarsSpinner size={24} />
      </div>
    );
  }
  if (view == 'file') {
    return <FileView onBack={handleBack} selectedFile={selectedFile} />;
  }
  return (
    <div className="p-4 flex flex-col gap-4">
      <p className="text-base">
        Fine tune clawpilot by editing core files. Do at your own risk.{' '}
      </p>
      <div className="flex gap-2 flex-wrap">
        {files?.map(file => {
          return (
            <Button
              onClick={() => handleSelectFile(file)}
              key={file.path}
              variant="outline"
              className="bg-transparent"
            >
              <IconFileBend /> {file.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default AdvancedTab;
