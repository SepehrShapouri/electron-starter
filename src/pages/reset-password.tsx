import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/auth-layout';
import AuthNotice from '../components/auth/AuthNotice';
import AuthSurface from '../components/auth/AuthSurface';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/auth-api';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setSuccess('Password updated. You can sign in now.');
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Unable to reset password.'
      );
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    resetMutation.mutate({ token, password });
  };

  return (
    <AuthLayout
      title="Set a new password"
      description="Paste your reset token and choose a new password."
    >
      <AuthSurface>
        <div className="space-y-4">
          <AuthNotice error={error} success={success} />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-token">Reset token</Label>
              <Input
                id="reset-token"
                value={token}
                onChange={event => setToken(event.target.value)}
                placeholder="Paste the token from your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>
            <Button
              className="w-full"
              type="submit"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating
                </span>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Ready to sign in?{' '}
            <Link
              to="/auth/login"
              className="text-foreground/80 hover:text-foreground"
            >
              Go to login
            </Link>
            .
          </p>
        </div>
      </AuthSurface>
    </AuthLayout>
  );
}
