import {
    Card,
    CardContent,
    CardHeader
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState() {
    return (
      <div className="space-y-3" aria-label="Loading scheduled tasks">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="gap-3 py-4">
            <CardHeader className="space-y-2 px-4 sm:px-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  