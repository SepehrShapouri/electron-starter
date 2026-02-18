import ScheduledPage from '@/pages/scheduled';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/scheduled')({
  component: ScheduledPage,
});
