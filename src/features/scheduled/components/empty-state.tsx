import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';

export function EmptyState() {
  return (
    <Card className="gap-2 py-8">
      <CardHeader className="items-center px-6 text-center">
        <CardTitle className="text-base">No scheduled tasks yet</CardTitle>
        <CardDescription>
          When tasks are scheduled in your gateway, they will appear here.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
