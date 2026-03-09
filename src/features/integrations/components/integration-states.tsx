import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Loader2, RefreshCw, Search } from 'lucide-react';

export function IntegrationErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle className="text-base">Could not load integrations</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Retrying
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function IntegrationSearchEmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <Empty className="rounded-xl border bg-card py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search className="h-4 w-4" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No matching integrations</EmptyTitle>
        <EmptyDescription>
          No integrations matched &quot;{query}&quot;. Try another service,
          capability, or keyword.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" onClick={onClear}>
          Clear search
        </Button>
      </EmptyContent>
    </Empty>
  );
}
