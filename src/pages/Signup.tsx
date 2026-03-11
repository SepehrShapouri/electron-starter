import { LegalLinks } from '@/components/auth/legal-links';
import Google from '@/components/icons/Google.svg';
import IconScanTextSparkle from '@/components/icons/IconScanTextSparkle.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { authApi } from '@/lib/auth-api';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import gsap from 'gsap';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be 80 characters or less.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'https://api.clawpilot.ai';
const desktopAuthBridgeBase = `${apiBaseUrl}/api/v1/auth/electron`;

export default function Signup() {
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
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const signUpMutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      navigate({ to: '/onboarding' });
    },
    onError: (err: unknown) => {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Unable to create account.',
      });
    },
  });

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

  const onSubmit = (values: SignupFormValues) => {
    signUpMutation.mutate({
      name: values.name.trim(),
      email: values.email,
      password: values.password,
    });
  };

  const handleGoogleSignUp = async () => {
    if (googleLoading) {
      return;
    }

    setGoogleLoading(true);

    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${desktopAuthBridgeBase}/callback?next=/app`,
        newUserCallbackURL: `${desktopAuthBridgeBase}/callback?next=/onboarding`,
        errorCallbackURL: `${desktopAuthBridgeBase}/error?next=/auth/signup`,
        disableRedirect: true,
      });

      if (result.error) {
        setError('root', {
          message: result.error.message || 'Unable to sign up with Google.',
        });
        return;
      }

      const redirectUrl = (result.data as { url?: string } | null)?.url;
      if (!redirectUrl) {
        setError('root', {
          message: 'Unable to start Google sign-up.',
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
            : 'Unable to sign up with Google.',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const navigateWithExit = (
    to: '/auth/welcome' | '/auth/login' | '/auth/signup-magic-link'
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
    <div
      ref={containerRef}
      className={cn(
        'w-full h-full max-h-[568px] p-8 rounded-3xl bg-floated-blur backdrop-blur-[100px] flex gap-16'
      )}
    >
      <div className="flex w-full flex-col justify-between h-full">
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-muted-foreground">
            Create your account
          </p>
          <p className="text-3xl font-medium text-foreground">
            Get started with Clawpilot
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {!!errors.root && (
            <Alert variant="secondaryDestructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm font-medium text-foreground">
            Already a member?
            <Link
              className="underline"
              to="/auth/signup"
              onClick={event => {
                event.preventDefault();
                navigateWithExit('/auth/login');
              }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex w-full flex-col justify-between h-full">
        <div className="flex w-full flex-col items-start gap-8">
          <div className="flex flex-col gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full bg-transparent shadow-sm"
              onClick={() => {
                void handleGoogleSignUp();
              }}
              disabled={googleLoading}
            >
              <Google />
              {googleLoading
                ? 'Connecting to Google...'
                : 'Continue with Google'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full bg-transparent shadow-sm"
              onClick={() => {
                navigateWithExit('/auth/signup-magic-link');
              }}
            >
              <IconScanTextSparkle className="text-foreground" />
              Get a Magic Link
            </Button>
          </div>
          <div className="flex items-center gap-6 w-full">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <Input
                  size="xl"
                  variant="soft"
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  className="h-11"
                  autoFocus
                  {...register('name')}
                />
                {errors.name?.message && (
                  <p className="text-xs text-red-9">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <Input
                  size="xl"
                  variant="soft"
                  id="email"
                  type="Enter email address"
                  placeholder="Email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="h-11"
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
                    size="xl"
                    variant="soft"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    className="h-11 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(show => !show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
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
              <Button
                type="submit"
                disabled={signUpMutation.isPending}
                className="h-11 w-full"
              >
                {signUpMutation.isPending
                  ? 'Creating account...'
                  : 'Create account'}
              </Button>
            </div>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{' '}
          <LegalLinks className="text-muted-foreground" />.
        </p>
      </div>
    </div>
  );
}
