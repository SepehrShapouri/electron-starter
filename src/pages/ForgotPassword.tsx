import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthNotice from '../components/auth/AuthNotice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authApi } from '../lib/auth-api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const forgotMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setSuccess('Check your inbox for a reset link.');
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    forgotMutation.mutate({ email });
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="We will email you a reset token to finish the process."
    >
      <Card className="border-border/60 bg-card shadow-none">
        <CardContent className="space-y-4 pt-6">
          <AuthNotice error={error} success={success} />
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@clawpilot.ai"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={forgotMutation.isPending}>
              {forgotMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending
                </span>
              ) : (
                'Send reset email'
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Remembered your password?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
