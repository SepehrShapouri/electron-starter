import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';

export function ErrorState({
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
          <CardTitle className="text-base">
            Could not load scheduled tasks
          </CardTitle>
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