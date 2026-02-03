import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { authApi } from '../lib/auth-api';

export default function AppHome() {
  const navigate = useNavigate();
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
  });

  const signOutMutation = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      sessionQuery.refetch();
      navigate({ to: '/login' });
    },
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
