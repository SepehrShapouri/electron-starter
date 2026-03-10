import { BarsSpinner } from '@/components/bars-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { sileo } from 'sileo';
import { z } from 'zod';
import { ChangePasswordForm } from './change-password-form';

const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be 80 characters or less.'),
  email: z.string().trim().email('Enter a valid email address.'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;
type AccountView = 'profile' | 'password';

type AuthAccount = {
  provider?: string;
  providerId?: string;
};

type AccountClient = typeof authClient & {
  updateUser: (input: { name: string }) => Promise<{
    error?: { message?: string } | null;
  }>;
  changeEmail: (input: {
    newEmail: string;
    callbackURL: string;
  }) => Promise<{
    error?: { message?: string } | null;
  }>;
  listAccounts: () => Promise<{
    data?: AuthAccount[];
    error?: { message?: string | null } | null;
  }>;
};

const accountClient = authClient as AccountClient;

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'https://api.clawpilot.ai';

const getEmailChangeCallbackUrl = () => {
  if (window.electronAPI) {
    return `${apiBaseUrl}/api/v1/auth/electron/callback?next=/app`;
  }

  return `${window.location.origin}/app`;
};

const getCredentialAccounts = (accounts: AuthAccount[] | undefined) =>
  (accounts ?? []).filter(account => {
    const providerId = (account.providerId ?? account.provider ?? '').toLowerCase();
    return providerId === 'credential' || providerId === 'email-password';
  });

export function AccountTab() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<AccountView>('profile');

  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => (await authClient.getSession()).data?.user,
  });

  const {
    data: accountRecords,
    isLoading: isLoadingAccounts,
    isError: accountRecordsError,
  } = useQuery({
    queryKey: ['auth-accounts'],
    queryFn: async () => {
      const result = await accountClient.listAccounts();
      if (result.error) {
        throw new Error(result.error.message || 'Unable to load linked accounts.');
      }

      return result.data ?? [];
    },
  });

  const hasPasswordAccount = useMemo(() => {
    if (accountRecordsError) {
      return true;
    }

    return getCredentialAccounts(accountRecords).length > 0;
  }, [accountRecords, accountRecordsError]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setError,
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  useEffect(() => {
    reset({
      name: data?.name ?? '',
      email: data?.email ?? '',
    });
  }, [data?.email, data?.name, reset]);

  useEffect(() => {
    if (!hasPasswordAccount && view === 'password') {
      setView('profile');
    }
  }, [hasPasswordAccount, view]);

  const saveMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const nextName = values.name.trim();
      const nextEmail = values.email.trim().toLowerCase();
      const currentName = (data?.name ?? '').trim();
      const currentEmail = (data?.email ?? '').trim().toLowerCase();

      if (nextName !== currentName) {
        const result = await accountClient.updateUser({
          name: nextName,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Unable to update name.');
        }
      }

      if (nextEmail !== currentEmail) {
        const result = await accountClient.changeEmail({
          newEmail: nextEmail,
          callbackURL: getEmailChangeCallbackUrl(),
        });

        if (result.error) {
          throw new Error(result.error.message || 'Unable to update email.');
        }
      }

      return {
        nameChanged: nextName !== currentName,
        emailChanged: nextEmail !== currentEmail,
        name: nextName,
        email: nextEmail,
      };
    },
    onSuccess: async result => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      reset({
        name: result.name,
        email: result.email,
      });
      if (!result.nameChanged && !result.emailChanged) {
        sileo.info({ description: 'No account changes to save.' });
        return;
      }

      sileo.success({
        description: result.emailChanged
          ? 'Account updated. Check your inbox if email confirmation is required.'
          : 'Account updated.',
      });
    },
    onError: error => {
      setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update account settings.',
      });
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarsSpinner size={24} />
      </div>
    );
  }

  if (view === 'password') {
    return <ChangePasswordForm onBack={() => setView('profile')} />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full w-full flex-col justify-between"
      noValidate
    >
      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <Label htmlFor="settings-account-name">Name</Label>
          <Input
            id="settings-account-name"
            placeholder="Add your name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name?.message ? (
            <p className="text-xs text-red-9">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="settings-account-email">Email</Label>
          <Input
            id="settings-account-email"
            placeholder="Email address"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email?.message ? (
            <p className="text-xs text-red-9">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Label>Password</Label>
          <div className="flex gap-3">
            <Input placeholder="*********" type="password" disabled />
            <Button
              variant="secondary"
              type="button"
              disabled={!hasPasswordAccount || isLoadingAccounts}
              onClick={() => setView('password')}
            >
              {isLoadingAccounts ? 'Loading...' : 'Change'}
            </Button>
          </div>
          {!hasPasswordAccount && !isLoadingAccounts ? (
            <p className="text-xs text-muted-foreground">
              Password changes are unavailable for this sign-in method.
            </p>
          ) : null}
        </div>
        {errors.root?.message ? (
          <p className="text-sm text-red-9">{errors.root.message}</p>
        ) : null}
      </div>
      <div className="flex w-full justify-end gap-2 p-4">
        <Button
          variant="ghost"
          type="button"
          disabled={saveMutation.isPending || !isDirty}
          onClick={() =>
            reset({
              name: data?.name ?? '',
              email: data?.email ?? '',
            })
          }
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
          {saveMutation.isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
