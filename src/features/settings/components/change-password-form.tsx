import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { sileo } from 'sileo';
import { z } from 'zod';

const passwordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .max(128, 'New password must be 128 characters or less.'),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine(values => values.newPassword !== values.currentPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

type AuthClientError = {
  message?: string | null;
};

type AuthClientResponse<T> = {
  data?: T;
  error?: AuthClientError | null;
};

type PasswordClient = typeof authClient & {
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) => Promise<AuthClientResponse<unknown>>;
};

const passwordClient = authClient as PasswordClient;

type ChangePasswordFormProps = {
  onBack: () => void;
};

export function ChangePasswordForm({
  onBack,
}: ChangePasswordFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
    setError,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: true,
    },
  });

  const revokeOtherSessions = watch('revokeOtherSessions');

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const result = await passwordClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Unable to change password.');
      }

      return result.data;
    },
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ['auth-accounts'] });
      sileo.success({ description: 'Password updated.' });
      onBack();
    },
    onError: error => {
      setError('root', {
        message:
          error instanceof Error ? error.message : 'Unable to change password.',
      });
    },
  });

  const onSubmit = (values: PasswordFormValues) => {
    passwordMutation.mutate(values);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full w-full flex-col justify-between"
      noValidate
    >
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            type="button"
            size="sm"
            className="px-2"
            onClick={() => {
              reset();
              onBack();
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="space-y-1 px-4">
          <p className="text-sm font-medium">Change password</p>
          <p className="text-sm text-muted-foreground">
            Update your password without leaving the app.
          </p>
        </div>

        <div className="space-y-4 px-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="settings-current-password">
              Current password
            </Label>
            <Input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
            {errors.currentPassword?.message ? (
              <p className="text-xs text-red-9">
                {errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="settings-new-password">New password</Label>
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
            {errors.newPassword?.message ? (
              <p className="text-xs text-red-9">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="settings-confirm-password">
              Confirm new password
            </Label>
            <Input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword?.message ? (
              <p className="text-xs text-red-9">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <label className="flex items-start gap-3">
            <Checkbox
              checked={revokeOtherSessions}
              onCheckedChange={checked =>
                setValue('revokeOtherSessions', checked === true, {
                  shouldDirty: true,
                })
              }
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">Sign out other devices</p>
              <p className="text-sm text-muted-foreground">
                End your other active sessions after this password change.
              </p>
            </div>
          </label>

          {errors.root?.message ? (
            <p className="text-sm text-red-9">{errors.root.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full justify-end gap-2 p-4">
        <Button
          variant="ghost"
          type="button"
          disabled={passwordMutation.isPending || !isDirty}
          onClick={() => reset()}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={passwordMutation.isPending || !isDirty}
        >
          {passwordMutation.isPending ? 'Updating...' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}
