import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Clawpilot from '@/components/icons/Clawpilot.svg';
import IconMagicWand2 from '@/components/icons/IconMagicWand2.svg';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowUp, Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import gsap from 'gsap';
import { authApi } from '@/lib/auth-api';

const signupNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be 80 characters or less.');

const signupCredentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type SignupCredentialsValues = z.infer<typeof signupCredentialsSchema>;

const PART_1 = 'Hey there.';
const PART_2 = ' What should I call you?';
const CHAR_DELAY = 55;

export default function Signup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameStepRef = useRef<HTMLDivElement>(null);
  const credentialsStepRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const inputElRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'name' | 'credentials'>('name');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [typingDone, setTypingDone] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const hasTypedRef = useRef(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignupCredentialsValues>({
    resolver: zodResolver(signupCredentialsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpMutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      await authApi
        .saveOnboarding({ completed: true, onboardingStep: 'completed' })
        .catch(() => null);
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      navigate({ to: '/' });
    },
    onError: (err: unknown) => {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Unable to create account.',
      });
    },
  });

  const typewriterEffect = useCallback(() => {
    let index = 0;
    let pauseDone = false;

    const tick = () => {
      if (index < PART_1.length) {
        index++;
        setDisplayedText(PART_1.slice(0, index));
        setTimeout(tick, CHAR_DELAY);
        return;
      }

      if (!pauseDone) {
        pauseDone = true;
        setTimeout(tick, 700);
        return;
      }

      const part2Index = index - PART_1.length;
      if (part2Index < PART_2.length) {
        index++;
        setDisplayedText(PART_1 + PART_2.slice(0, part2Index + 1));
        setTimeout(tick, CHAR_DELAY);
        return;
      }

      setTypingDone(true);
      hasTypedRef.current = true;
    };

    setTimeout(tick, CHAR_DELAY);
  }, []);

  useEffect(() => {
    if (step !== 'name') {
      return;
    }

    const enterTween = gsap.fromTo(
      nameStepRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );

    if (hasTypedRef.current) {
      setDisplayedText(PART_1 + PART_2);
      setTypingDone(true);
      return () => {
        enterTween.kill();
      };
    }

    setTypingDone(false);
    setDisplayedText('');
    const timeoutId = window.setTimeout(typewriterEffect, 500);

    return () => {
      clearTimeout(timeoutId);
      enterTween.kill();
    };
  }, [step, typewriterEffect]);

  useEffect(() => {
    if (!typingDone || step !== 'name') {
      return;
    }

    const inputTween = gsap.fromTo(
      inputAreaRef.current,
      { y: 10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.35,
        ease: 'power2.out',
        onComplete: () => {
          inputElRef.current?.focus();
        },
      }
    );

    return () => {
      inputTween.kill();
    };
  }, [typingDone, step]);

  useEffect(() => {
    if (step !== 'credentials') {
      return;
    }

    const enterTween = gsap.fromTo(
      credentialsStepRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );

    return () => {
      enterTween.kill();
    };
  }, [step]);

  const navigateWithExit = (
    to: '/auth/welcome' | '/auth/login' | '/auth/signup-magic-link',
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

  const goToCredentials = () => {
    const parsedName = signupNameSchema.safeParse(name.trim());
    if (!parsedName.success) {
      setNameError(parsedName.error.issues[0]?.message ?? 'Enter your name.');
      return;
    }

    setNameError(null);
    gsap
      .timeline({
        onComplete: () => {
          setStep('credentials');
        },
      })
      .to(nameStepRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.35,
        ease: 'power2.in',
      });
  };

  const backToNameStep = () => {
    gsap
      .timeline({
        onComplete: () => {
          setStep('name');
        },
      })
      .to(credentialsStepRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.35,
        ease: 'power2.in',
      });
  };

  const onSubmitCredentials = (values: SignupCredentialsValues) => {
    const parsedName = signupNameSchema.safeParse(name.trim());
    if (!parsedName.success) {
      setStep('name');
      setNameError(parsedName.error.issues[0]?.message ?? 'Enter your name.');
      return;
    }

    const payload: { name: string; email: string; password: string } = {
      name: parsedName.data,
      email: values.email,
      password: values.password,
    };
    signUpMutation.mutate(payload);
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-6')}>
      {step === 'name' && (
        <div ref={nameStepRef} className="flex min-h-[320px] flex-col">
          <button
            onClick={() => navigateWithExit('/auth/welcome')}
            className="mb-10 flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <Clawpilot className="mb-8 h-9 w-9 text-muted-foreground" />

          <div className="flex-1">
            <p className="text-lg font-light leading-relaxed tracking-tight text-foreground">
              <span>{displayedText}</span>
              <span className="ml-0.5 inline-block h-5 w-px translate-y-0.5 animate-pulse bg-foreground" />
            </p>
          </div>

          <div ref={inputAreaRef} className="mt-auto pt-10 opacity-0">
            <form
              onSubmit={event => {
                event.preventDefault();
                goToCredentials();
              }}
            >
              <label htmlFor="name" className="sr-only">
                Your name
              </label>
              <div className="flex items-center gap-3 border-b border-border/80 px-1 pb-2 transition-colors focus-within:border-foreground/40">
                <input
                  ref={inputElRef}
                  id="name"
                  type="text"
                  value={name}
                  onChange={event => {
                    setName(event.target.value);
                    if (nameError) {
                      setNameError(null);
                    }
                  }}
                  placeholder="Type your name..."
                  autoComplete="name"
                  className="flex-1 bg-transparent text-sm tracking-tight text-foreground placeholder:text-muted-foreground/85 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/90 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Submit name"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
            {nameError && (
              <p className="mt-2 text-xs text-red-9">{nameError}</p>
            )}
          </div>
        </div>
      )}

      {step === 'credentials' && (
        <div ref={credentialsStepRef}>
          <button
            onClick={backToNameStep}
            className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <Clawpilot className="mb-8 h-9 w-9 text-muted-foreground" />

          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Hey {name.trim()}, almost there.
          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">
            Create your account credentials.
          </p>

          <form
            onSubmit={handleSubmit(onSubmitCredentials)}
            className="mt-8"
            noValidate
          >
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
                  <p className="text-xs text-red-9">
                    {errors.email.message}
                  </p>
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

              {!!errors.root && (
                <Alert variant="secondaryDestructive">
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button
              type="submit"
              disabled={signUpMutation.isPending}
              className="mt-4 h-11 w-full"
            >
              {signUpMutation.isPending
                ? 'Creating account...'
                : 'Create account'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="xl"
              className="mt-3 w-full"
              onClick={() => {
                navigateWithExit('/auth/signup-magic-link');
              }}
            >
              <IconMagicWand2 />
              Get a Magic Link
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
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

          <p className="mt-2 px-2 text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      )}
    </div>
  );
}
