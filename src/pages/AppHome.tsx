import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { authApi, GatewayProvision } from '../lib/auth-api';
import {
  loadGatewayProfile,
  saveGatewayProfile,
  GatewayProfile,
} from '../lib/gateway-storage';

export default function AppHome() {
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
  });

  const gatewayProfile = loadGatewayProfile();

  const provisionQuery = useQuery({
    queryKey: ['gateway-provision'],
    queryFn: authApi.provisionGateway,
    enabled: !gatewayProfile,
  });

  const signOutMutation = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      sessionQuery.refetch();
      navigate({ to: '/login' });
    },
  });

  useEffect(() => {
    if (provisionQuery.data && !gatewayProfile) {
      saveGatewayProfile(provisionQuery.data);
    }
  }, [provisionQuery.data, gatewayProfile]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const resolvedProfile: GatewayProfile | GatewayProvision | null =
    gatewayProfile ?? provisionQuery.data ?? null;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Clawpilot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="text-sm text-muted-foreground">Signed in as</div>
            <div className="text-base font-medium">
              {sessionQuery.data?.email ?? 'Unknown user'}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="text-muted-foreground">Gateway</div>
            {resolvedProfile ? (
              <div className="mt-2 space-y-1">
                <div className="font-medium">{resolvedProfile.gatewayUrl}</div>
                <div className="text-xs text-muted-foreground">
                  Status: {resolvedProfile.status ?? 'ready'}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                {provisionQuery.isLoading
                  ? 'Provisioning gateway...'
                  : 'Provisioning unavailable.'}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            This is the protected main route. Build your app UI here once
            authentication is ready.
          </p>
          <Button
            variant="outline"
            onClick={() => signOutMutation.mutate()}
            disabled={signOutMutation.isPending}
          >
            {signOutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
