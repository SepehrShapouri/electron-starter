import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarsSpinner } from '@/components/bars-spinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModelSelectCard } from '@/features/onboarding/components/model-select-card';
import {
  encryptPayload,
  getErrorMessage,
  providerKeyInfo,
  type KeySource,
} from '@/features/onboarding/lib/utils';
import { authApi } from '@/lib/auth-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function InstanceSetup() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState('anthropic');
  const [keySource, setKeySource] = useState<KeySource>('credits');
  const [apiKey, setApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isByok = keySource === 'byok';
  const keyInfo = providerKeyInfo[selectedModel] ?? providerKeyInfo.anthropic;

  const launchMutation = useMutation({
    mutationFn: async () => {
      if (isByok && !apiKey.trim()) {
        throw new Error('API key is required');
      }
      const { key } = await authApi.getOnboardingEncryptionKey();
      const encryptedPayload = await encryptPayload(key, {
        model: selectedModel,
        keySource,
        apiKey: isByok ? apiKey : undefined,
      });
      return authApi.provisionFromOnboarding({ encryptedPayload });
    },
    onSuccess: data => {
      queryClient.setQueryData(['gateway-provision'], data);
    },
    onError: error => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-medium text-foreground">Set up your agent</p>
          <p className="text-sm text-muted-foreground">
            Choose a model to power your personal agent.
          </p>
        </div>

        <ModelSelectCard selectedModel={selectedModel} onSelect={setSelectedModel} />

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Checkbox
              checked={isByok}
              id="setup-byok"
              onCheckedChange={checked => setKeySource(checked ? 'byok' : 'credits')}
              className="size-5 cursor-pointer rounded-md"
            />
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="setup-byok"
                className="text-sm font-medium text-foreground"
              >
                Use your own API key
              </Label>
              <Label
                htmlFor="setup-byok"
                className="text-xs text-muted-foreground"
              >
                Bring your own provider key for unlimited usage
              </Label>
            </div>
          </div>

          {isByok && (
            <Input
              size="xl"
              variant="soft"
              type="password"
              placeholder={keyInfo.placeholder}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          )}
        </div>

        {errorMessage && (
          <Alert variant="secondaryDestructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Button
          size="lg"
          onClick={() => launchMutation.mutate()}
          disabled={launchMutation.isPending}
        >
          {launchMutation.isPending && <BarsSpinner size={16} />}
          Launch agent
        </Button>
      </div>
    </div>
  );
}
