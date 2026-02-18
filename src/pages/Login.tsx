import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import Google from '@/components/icons/Google.svg';
import IconMagicWand2 from '@/components/icons/IconMagicWand2.svg';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import gsap from 'gsap';
import { authApi } from '@/lib/auth-api';
import { authClient } from '@/lib/auth-client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'https://api.clawpilot.ai';
const desktopAuthBridgeBase = `${apiBaseUrl}/api/v1/auth/electron`;

export default function Login() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signInMutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      const onboarding = await authApi.getOnboarding().catch(() => null);
      navigate({ to: onboarding?.completed ? '/app' : '/onboarding' });
    },
    onError: (err: unknown) => {
      setError('root', {
        message: err instanceof Error ? err.message : 'Unable to sign in.',
      });
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    signInMutation.mutate(values);
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) {
      return;
    }

    setGoogleLoading(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${desktopAuthBridgeBase}/callback?next=/app`,
        newUserCallbackURL: `${desktopAuthBridgeBase}/callback?next=/onboarding`,
        errorCallbackURL: `${desktopAuthBridgeBase}/error?next=/auth/login`,
        disableRedirect: true,
      });

      if (result.error) {
        setError('root', {
          message: result.error.message || 'Unable to sign in with Google.',
        });
        return;
      }

      const redirectUrl = (result.data as { url?: string } | null)?.url;
      if (!redirectUrl) {
        setError('root', {
          message: 'Unable to start Google sign-in.',
        });
        return;
      }

      if (window.electronAPI) {
        await window.electronAPI.openExternalUrl(redirectUrl);
        return;
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to sign in with Google.',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const tween = gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );

    return () => {
      tween.kill();
    };
  }, []);

  const navigateWithExit = (
    to: '/auth/welcome' | '/auth/signup' | '/auth/login-magic-link',
  ) => {
    gsap
      .timeline({
        onComplete: () => {
          navigate({ to });
        },
      })
      .to(containerRef.current, {
        opacity: 0,
        y: to === '/auth/welcome' ? 20 : -20,
        duration: 0.35,
        ease: 'power2.in',
      });
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-6')}>
      <button
        onClick={() => navigateWithExit('/auth/welcome')}
        className="flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        type="button"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="flex flex-col gap-3">
        <Clawpilot className="h-9 w-9 text-muted-foreground" />
        <h1 className="text-2xl font-light tracking-tight text-foreground">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your clawpilot account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className="h-11"
              autoFocus
              {...register('email')}
            />
            {errors.email?.message && (
              <p className="text-xs text-red-9">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="h-11 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(show => !show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-xs text-red-9">
                {errors.password.message}
              </p>
            )}
          </div>

          {!!errors.root && (
            <Alert variant="secondaryDestructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={signInMutation.isPending}
            className="h-11 w-full"
          >
            {signInMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>

      <div className="my-2 flex items-center gap-6">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">Or continue with</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="w-full"
          onClick={() => {
            void handleGoogleSignIn();
          }}
          disabled={googleLoading}
        >
          <Google />
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="xl"
          className="w-full"
          onClick={() => {
            navigateWithExit('/auth/login-magic-link');
          }}
        >
          <IconMagicWand2 />
          Get a Magic Link
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>Don&apos;t have an account?</span>
        <Link
          to="/auth/signup"
          onClick={event => {
            event.preventDefault();
            navigateWithExit('/auth/signup');
          }}
          className="text-foreground/80 transition-colors hover:text-foreground"
        >
          Sign up
        </Link>
      </div>

      <p className="px-2 text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{' '}
        and <a href="#">Privacy Policy</a>.
      </p>
    </div>
  );
}
