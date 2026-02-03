import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import AuthLayout from '../components/auth/auth-layout';
import { authApi } from '../lib/auth-api';
import logoUrl from '../assets/clawpilot-full.png';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
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
      navigate({ to: '/app' });
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
  return (
    <AuthLayout>
      <div className={cn('flex flex-col gap-6')}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <img
                src={logoUrl}
                alt="Clawpilot"
                className="object-contain h-10"
              />
              <span className="sr-only">clawpilot</span>
              <h1 className="text-xl font-bold">Welcome to clawpilot</h1>
              <FieldDescription>
                Don&apos;t have an account?{' '}
                <Link
                  to="/auth/signup"
                  className="text-foreground/80 hover:text-foreground"
                >
                  Sign up
                </Link>
              </FieldDescription>
            </div>
            {!!errors.root && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="********"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldError errors={[errors.password]} />
            </Field>
            <Field>
              <Button type="submit" disabled={signInMutation.isPending}>
                Login
              </Button>
            </Field>
          </FieldGroup>
        </form>
        <FieldDescription className="px-6 text-center">
          By clicking continue, you agree to our{' '}
          <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
        </FieldDescription>
      </div>
    </AuthLayout>
  );
}
