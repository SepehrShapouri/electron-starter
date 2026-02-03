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

export default function Signup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUpMutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      setSuccess('Account created. You are now signed in.');
      navigate({ to: '/' });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    signUpMutation.mutate({ name, email, password });
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Start a new Clawpilot workspace in seconds."
    >
      <Card className="border-border/60 bg-card shadow-none">
        <CardContent className="space-y-4 pt-6">
          <AuthNotice error={error} success={success} />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan Lee"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@clawpilot.ai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={signUpMutation.isPending}>
              {signUpMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Already have access?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in instead
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
