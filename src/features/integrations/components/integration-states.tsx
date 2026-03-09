import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Search
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <CardTitle className="text-base">No matching integrations</CardTitle>
        <CardDescription>
          No integrations matched &quot;{query}&quot;. Try another service,
          capability, or keyword.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Button type="button" variant="outline" onClick={onClear}>
          Clear search
        </Button>
      </CardContent>
    </Card>
  );
}
