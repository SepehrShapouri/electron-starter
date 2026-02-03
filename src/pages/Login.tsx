import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthNotice from '../components/auth/AuthNotice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/auth-api';

export default function Login() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInMutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      setSuccess('Signed in successfully.');
      navigate({ to: '/' });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    signInMutation.mutate({ email, password });
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in with your email and password to continue."
    >
      <Card className="border-border/60 bg-card shadow-none">
        <CardContent className="space-y-4 pt-6">
          <AuthNotice error={error} success={success} />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@clawpilot.ai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Forgot your password?</span>
                <Link to="/forgot" className="text-primary hover:underline">
                  Reset it
                </Link>
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            New here?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Create an account
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
