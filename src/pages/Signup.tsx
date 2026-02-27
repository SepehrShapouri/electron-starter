import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { LegalLinks } from '@/components/auth/legal-links';
import TermsCheckbox from '@/components/auth/terms-checkbox';
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
const TERMS_ERROR_MESSAGE =
  'Please accept the Terms of Service, Privacy Policy, and EULA to continue.';

export default function Signup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    if (!termsAccepted) {
      setError('root', {
        message: TERMS_ERROR_MESSAGE,
      });
      return;
    }

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

    if (!termsAccepted) {
      setError('root', {
        message: TERMS_ERROR_MESSAGE,
      });
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

  const navigateWithExit = (to: '/auth/welcome' | '/auth/login') => {
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
          Create your account.
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started with clawpilot.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="sr-only">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Name"
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
              id="email"
              type="email"
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
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="new-password"
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
              <p className="text-xs text-red-9">{errors.password.message}</p>
            )}
          </div>

          <TermsCheckbox
            checked={termsAccepted}
            onCheckedChange={setTermsAccepted}
          />

          {!!errors.root && (
            <Alert variant="secondaryDestructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

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
            void handleGoogleSignUp();
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
            if (!termsAccepted) {
              setError('root', {
                message: TERMS_ERROR_MESSAGE,
              });
              return;
            }
            navigate({ to: '/auth/signup-magic-link' });
          }}
        >
          <IconMagicWand2 />
          Get a Magic Link
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>Already have an account?</span>
        <Link
          to="/auth/login"
          onClick={event => {
            event.preventDefault();
            navigateWithExit('/auth/login');
          }}
          className="text-foreground/80 transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </div>

      <p className="px-2 text-center text-xs text-muted-foreground">
        By clicking continue, you agree to our <LegalLinks />.
      </p>
    </div>
  );
}
