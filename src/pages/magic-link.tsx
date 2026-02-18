import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import IconEmail1Sparkle from '@/components/icons/IconEmail1Sparkle.svg';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type MagicLinkMode = 'signin' | 'signup';

type MagicLinkPageProps = {
  mode: MagicLinkMode;
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'https://api.clawpilot.ai';
const desktopAuthBridgeBase = `${apiBaseUrl}/api/v1/auth/electron`;

export default function MagicLinkPage({ mode }: MagicLinkPageProps) {
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const backPath = isSignUp ? '/auth/signup' : '/auth/login';
  const currentPath = isSignUp
    ? '/auth/signup-magic-link'
    : '/auth/login-magic-link';

  const sendMagicLinkMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      callbackURL: string;
      newUserCallbackURL: string;
      errorCallbackURL: string;
    }) => authClient.signIn.magicLink(payload),
  });

  const continuePath = useMemo(() => {
    return isSignUp ? '/auth/welcome' : '/app';
  }, [isSignUp]);

  const handleSendMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendMagicLinkMutation.isPending) {
      return;
    }

    setErrorMessage('');

    try {
      await sendMagicLinkMutation.mutateAsync({
        email,
        callbackURL: `${desktopAuthBridgeBase}/callback?next=${encodeURIComponent(
          continuePath,
        )}`,
        newUserCallbackURL: `${desktopAuthBridgeBase}/callback?next=/auth/welcome`,
        errorCallbackURL: `${desktopAuthBridgeBase}/error?next=${encodeURIComponent(
          currentPath,
        )}`,
      });
      setMagicLinkSent(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send magic link.',
      );
    }
  };

  const handleResend = () => {
    setMagicLinkSent(false);
  };

  if (magicLinkSent) {
    return (
      <div className={cn('flex flex-col gap-6')}>
        <IconEmail1Sparkle className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Magic link sent.
          </h1>
          <p className="text-sm text-muted-foreground">
            Check your inbox for a secure sign-in link.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          onClick={handleResend}
        >
          Resend link
        </Button>

        <Button asChild type="button" variant="ghost" className="h-11 w-full">
          <Link to={backPath}>Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      <Link
        to={backPath}
        className="flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <div className="flex flex-col gap-3">
        <Clawpilot className="h-9 w-9 text-muted-foreground" />
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Get a magic link.
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send you a sign-in link.
        </p>
      </div>

      <form onSubmit={handleSendMagicLink} noValidate className="mt-2">
        <div className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            className="h-11"
            value={email}
            onChange={event => {
              setEmail(event.target.value);
            }}
          />

          <Button
            type="submit"
            disabled={sendMagicLinkMutation.isPending}
            className="h-11 w-full"
          >
            {sendMagicLinkMutation.isPending ? 'Sending...' : 'Continue'}
          </Button>

          {errorMessage ? (
            <Alert variant="secondaryDestructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </form>
    </div>
  );
}
