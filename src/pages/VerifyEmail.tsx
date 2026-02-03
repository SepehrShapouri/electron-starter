import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthNotice from '../components/auth/AuthNotice';
import AuthSurface from '../components/auth/AuthSurface';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { authApi } from '../lib/auth-api';

export default function VerifyEmail() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => setSuccess('Email verified. You can sign in now.'),
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'Unable to verify email.'),
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: () => setSuccess('Verification email sent.'),
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : 'Unable to resend email.'),
  });

  const handleVerify = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    verifyMutation.mutate({ token });
  };

  const handleResend = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    resendMutation.mutate({ email });
  };

  return (
    <AuthLayout
      title="Verify your email"
      description="Enter your verification token or resend the email."
    >
      <AuthSurface>
        <div className="space-y-4">
          <AuthNotice error={error} success={success} />
          <form className="space-y-4" onSubmit={handleVerify}>
            <div className="space-y-2">
              <Label htmlFor="verify-token">Verification token</Label>
              <Input
                id="verify-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the token from your email"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying
                </span>
              ) : (
                'Verify email'
              )}
            </Button>
          </form>

          <Separator />

          <form className="space-y-4" onSubmit={handleResend}>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Email</Label>
              <Input
                id="resend-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@clawpilot.ai"
                required
              />
            </div>
            <Button
              className="w-full"
              variant="outline"
              type="submit"
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending
                </span>
              ) : (
                'Resend verification email'
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Back to{' '}
            <Link to="/login" className="text-foreground/80 hover:text-foreground">
              sign in
            </Link>
            .
          </p>
        </div>
      </AuthSurface>
    </AuthLayout>
  );
}
