import { BarsSpinner } from '@/components/bars-spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authApi } from '@/lib/auth-api';
import { openExternalUrl } from '@/lib/open-external-url';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const formatSubscriptionStatus = (status: string | null, isActive: boolean) => {
  if (isActive) {
    return status === 'trialing' ? 'Trialing' : 'Active';
  }

  if (!status) {
    return 'No subscription';
  }

  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatNextBillingDate = (value: string | null | undefined) => {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

function BillingTab() {
  const billingQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: authApi.getBillingStatus,
  });

  const portalMutation = useMutation({
    mutationFn: authApi.createBillingPortalSession,
    onSuccess: async data => {
      await openExternalUrl(data.url);
    },
  });

  if (billingQuery.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <BarsSpinner size={24} />
      </div>
    );
  }

  if (billingQuery.isError) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Label>Billing</Label>
        <p className="text-sm text-red-9">
          {billingQuery.error instanceof Error
            ? billingQuery.error.message
            : 'Unable to load billing details.'}
        </p>
      </div>
    );
  }

  const billing = billingQuery.data;
  const hasPortalAccess = Boolean(billing?.customerId);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-2 flex-col gap-3">
          <Label>Subscription status</Label>
          <p className="text-2xl font-[500]">
            {formatSubscriptionStatus(
              billing?.status ?? null,
              billing?.isActive ?? false
            )}
          </p>
        </div>
        <Button
          onClick={() => portalMutation.mutate()}
          disabled={!hasPortalAccess || portalMutation.isPending}
        >
          {portalMutation.isPending ? (
            <>
              <BarsSpinner size={16} />
              Opening portal
            </>
          ) : (
            'Manage subscription'
          )}
        </Button>
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <Label>Plan</Label>
        <p className="text-2xl font-[500]">
          {billing?.planLabel ?? 'Unavailable'}
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <Label>Next billing date</Label>
        <p className="text-2xl font-[500]">
          {formatNextBillingDate(billing?.nextBillingDate)}
        </p>
      </div>
      {portalMutation.isError ? (
        <p className="text-sm text-red-9">
          {portalMutation.error instanceof Error
            ? portalMutation.error.message
            : 'Unable to open billing portal.'}
        </p>
      ) : null}
    </div>
  );
}

export default BillingTab;
